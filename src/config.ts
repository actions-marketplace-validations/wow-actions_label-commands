import * as github from '@actions/github'
import yaml from 'js-yaml'
import merge from 'lodash.merge'
import { Util } from './util'

export namespace Config {
  export type LockReason = 'off-topic' | 'too heated' | 'resolved' | 'spam'

  interface Actions {
    close?: boolean
    open?: boolean
    lock?: boolean
    unlock?: boolean
    lockReason?: LockReason
    pin?: boolean
    unpin?: boolean
    comment?: string | string[]
    reactions?: string | string[]
    labels?: string | string[]
  }

  interface Strict {
    [command: string]: Actions
  }

  interface Loose {
    issues?: Strict
    pulls?: Strict
  }

  type Definition = Strict & Loose

  const defaults: Definition = {
    heated: {
      comment: `The thread has been temporarily locked.\nPlease follow our community guidelines.`,
      lock: true,
      lockReason: 'too heated',
    },
    '-heated': {
      unlock: true,
    },

    issues: {
      feature: {
        close: true,
        comment:
          ':wave: @{{ author }}, please use our idea board to request new features.',
      },
      '-wontfix': {
        open: true,
      },
      'needs-more-info': {
        comment:
          'Hello @{{ author }} \nIn order to communicate effectively, we have a certain format requirement for the issue, your issue is automatically closed because there is no recurring step or reproducible warehouse, and will be REOPEN after the offer.',
        close: true,
      },
      '-needs-more-info': {
        open: true,
      },
    } as Strict,

    pulls: {},
  }

  export async function get(
    octokit: ReturnType<typeof github.getOctokit>,
    path?: string,
  ): Promise<Definition> {
    try {
      if (path) {
        const content = await Util.getFileContent(octokit, path)
        if (content) {
          const config = yaml.load(content) as Definition
          return merge({}, defaults, config)
        }
      }

      return defaults
    } catch (error) {
      if (error.status === 404) {
        return defaults
      }

      throw error
    }
  }

  export function getActions(
    config: Definition,
    type: 'issues' | 'pulls',
    label: string,
  ) {
    const section = config[type]
    if (section && section[label]) {
      return section[label]
    }

    return config[label] || {}
  }
}
