const cheerio = require('cheerio');
const moment = require('moment');

function extractListingsFromHTML (html) {
  const $ = cheerio.load(html);
  const vacancyRows = $('.view-Vacancies tbody tr');

  const vacancies = [];
  vacancyRows.each((i, el) => {

    // Extract information from each row of the jobs table
    let closing = $(el).children('.views-field-field-vacancy-deadline').first().text().trim();
    let job = $(el).children('.views-field-title').first().text().trim();
    let location = $(el).children('.views-field-name').text().trim();
    closing = closing.slice(0, closing.indexOf('-') - 1);
    closing = moment(closing, 'DD/MM/YYYY').toISOString();
    vacancies.push({closing, job, location});
  });

  return vacancies;
}

function formatJobs (list) {
  return list.reduce((acc, job) => {
    return `${acc}${job.job} in ${job.location} closing on ${moment(job.closing).format('LL')}\n\n`;
  }, 'We found:\n\n');
}

module.exports = {
  extractListingsFromHTML,
  formatJobs
};