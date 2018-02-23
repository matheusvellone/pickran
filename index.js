#!/usr/bin/env node

require('dotenv').config()
const GitHubApi = require('github')
const Promise = require('bluebird')
const {
    append,
    concat,
    flatten,
    map,
    pipe,
    prop,
    times,
    toLower,
} = require('ramda')
const chalk = require('chalk')

const DEFAULT_REVIEWERS_NUMBER = 3

const PR = process.argv[2]
const prRegex = /^([^/]+)\/([^#]+)#(\d+)/

if (!PR || !PR.match(prRegex)) {
    const prExample = chalk.bold('pagarme/pagarme-core#691')
    const error = chalk.red(chalk.bold('ERROR: You need to specify a PR to add reviewers like'))
    console.log(`${error} ${prExample}`)
    process.exit(1)
}
const REVIEWERS_NUMBER = process.argv[3] || (console.log(`Using default number of reviewers: ${DEFAULT_REVIEWERS_NUMBER}`) || DEFAULT_REVIEWERS_NUMBER)
const [, OWNER, REPO, PR_NUMBER] = PR.match(prRegex)

const pickRandomReviewers = ([users, avoid = []]) => {
    console.log(users, avoid)
    const reviewers = []

    const pickRandom = () => {
        if (users.length === 0) {
            return false
        }
        const reviewerIndex = Math.floor(Math.random() * users.length)
        const reviewer = users.splice(reviewerIndex, 1)[0]

        if (avoid.includes(reviewer)) {
            return pickRandom()
        }

        return reviewer
    }

    times(() => {
        const reviewer = pickRandom()
        if (reviewer) {
            reviewers.push(reviewer)
        }
    }, REVIEWERS_NUMBER)

    return reviewers
}

const extractName = pipe(prop('login'), toLower)
const getNames = map(extractName)

const getData = prop('data')
const { USERNAME, TOKEN } = process.env

const github = new GitHubApi({
    headers: { 'user-agent': 'pickran' },
})
github.authenticate({
    type: 'basic',
    username: USERNAME,
    password: TOKEN,
})

const getCurrentUser = github.users.get({})
    .then(getData)
    .then(extractName)

const getTeamMembers = teamId => github.orgs.getTeamMembers({ id: teamId })
    .then(getData)

const teamMembersPromise = getTeamMembers(2444012)
    .then(getNames)

const createReviewRequests = (reviewers) => {
    if (reviewers.length === 0) {
        return console.log('All reviewers from the selected team already were requested for review')
    }

    return github.pullRequests.createReviewRequest({
        owner: OWNER,
        repo: REPO,
        number: PR_NUMBER,
        reviewers,
    })
}

const prReviewersPromise = github.pullRequests.getReviewRequests({
    owner: OWNER,
    repo: REPO,
    number: PR_NUMBER,
})
    .then(getData)
    .then((response) => {
        return Promise.resolve(response.teams)
            .map(prop('id'))
            .map(getTeamMembers)
            .then(flatten)
            .then(concat(response.users))
    })
    .then(getNames)
    .then(reviewers => getCurrentUser.then(user => append(user, reviewers)))

Promise.all([
    teamMembersPromise,
    prReviewersPromise,
])
    .then(pickRandomReviewers)
    .tap(console.log)
    .then(createReviewRequests)
    .catch(console.error)

