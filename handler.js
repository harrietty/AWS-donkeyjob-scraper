const request = require('axios');
const AWS = require('aws-sdk');
var Nexmo = require('nexmo');
const dynamo = new AWS.DynamoDB.DocumentClient();
const { differenceWith, isEqual } = require('lodash');
const { extractListingsFromHTML, formatJobs } = require('./helpers');

const {NEXMO_API_KEY, NEXMO_API_SECRET} = require('./config');

module.exports.getdonkeyjobs = (event, context, callback) => {
  let newJobs, allJobs;

  request('https://www.thedonkeysanctuary.org.uk/vacancies')
    .then(({ data }) => {
      allJobs = extractListingsFromHTML(data);

      // Retrieve yesterday's jobs
      return dynamo.scan({
        TableName: 'donkeyjobs'
      }).promise();
    })
    .then(response => {
      // Figure out which jobs are new
      let yesterdaysJobs = response.Items[0] ? response.Items[0].jobs : [];

      newJobs = differenceWith(allJobs, yesterdaysJobs, isEqual);

      // Get the ID of yesterday's jobs which can now be deleted
      const jobsToDelete = response.Items[0] ? response.Items[0].listingId : null;

      // Delete old jobs
      if (jobsToDelete) {
        return dynamo.delete({
          TableName: 'donkeyjobs',
          Key: {
            listingId: jobsToDelete
          }
        }).promise();
      } else return;
    })
    .then(() => {
      // Save the list of today's jobs
      return dynamo.put({
        TableName: 'donkeyjobs',
        Item: {
          listingId: new Date().toString(),
          jobs: allJobs
        }
      }).promise();
    })
    .then(() => {
      if (newJobs.length) {
        const nexmo = new Nexmo({
          apiKey: NEXMO_API_KEY,
          apiSecret: NEXMO_API_SECRET
        });
        const jobsList = formatJobs(newJobs);
        nexmo.message.sendSms('Donkey Jobs Finder', '447506190696', 'Hello, we found new donkey jobs! ' + jobsList);
      }
      callback(null, { jobs: newJobs });
    })
    .catch(callback);
};
