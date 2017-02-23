#!/usr/bin/env node

/**
 * Module dependencies.
 */

var version = require(__dirname + '/package.json').version;
var config = require(__dirname + '/config.json');
var models = require(__dirname + '/lib/models');

var program = require('commander');
var truncate = require('truncate');
var async = require('async');
var CronJob = require('cron').CronJob;
var _ = require('underscore');

program
  .version(version)
  .option('-u, --url [url]', 'Specify API URL', config.apiUrl)
  .option('-i, --interval [interval]', 'If defined, poll the api every [interval] seconds')
  .parse(process.argv);

console.log('Using URL %s', program.url);

var api = require(__dirname + '/lib/api.js')(program.url);

if(program.interval) {
  var poll = '*/' + program.interval + ' * * * * *'
  console.log('Polling every %d seconds',program.interval);
  new CronJob(poll, function(){pollProjects(false)}, null, true);
} else {
  pollProjects(true);
}

var allProjects = [];
var allUsers = [];

function pollProjects(exit) {
  console.log('Sync users...');
  api.request('/users', 0, function(err, data){
      if(err) {
        console.log('ERROR', err);
        if(exit) process.exit(1);
        else return;
      }
      console.log('%d results, going to next page...', data.length);
      allUsers = _.union(allUsers, data);
  }, function(err, data){
    console.log('Obtained %d users, now saving data', allUsers.length);

    var calls = [];

    allUsers.forEach(function(u){
      calls.push(function(callback){
        var user = {id: u._id, userId:u.userId, name:u.name, role:u.role, bio:u.bio, avatar: u.picture};
        if(u.email) {
          user.email = u.email;
        }
        models.User.findOneAndUpdate({id: user.id},user,{upsert:true},function(){
          console.log('Imported user', user.userId,user.name);
          callback();
        });
      });

    });

    async.parallel(calls, function(err,result){
      if(err) {
        console.log('ERROR', err);
        if(exit) process.exit(1);
        else return;
      }
      console.log('Done importing %d users',result.length);

      console.log('Getting projects...');

      api.request('/projects', 0, function(err, data){
        if(err) {
          console.log('ERROR', err);
          if(exit) process.exit(1);
          else return;
        }
            console.log('%d results, going to next page...', data.length);
        allProjects = _.union(allProjects, data);
      }, function(){
        console.log('Obtained %d projects, now filtering', allProjects.length);
        console.log('Getting configured steps');

        models.Step.find().exec(function(err, steps){
          if(err) {
            console.log('ERROR', err);
            if(exit) process.exit(1);
            else return;
          }
          steps.forEach(function(step) {

            var projects = api.filterProjects(step.step, allProjects);
            if(!projects || !projects.length) {
              console.error('No filtered projects found for step %d, Fallback to Step 0 (Whatif)', step.step);
              projects = api.filterProjects(0, allProjects);
            }

            console.log('Step %d reduced to %d projects, saving to database', step.step, projects.length );

            models.Slide.findOne({step:step.step}, function(err, slide){
              if(err) {
                console.log('ERROR FIND SLIDE', err);
                if(exit) process.exit(1);
                else return;
              }
              if(!slide) slide = new models.Slide({step: step.step});
              //TODO: split multiple answers
              slide.slides = projects;
              slide.save(function(err, slide){
                if(err) {
                  console.log('ERROR SAVING SLIDE', err);
                  if(exit) process.exit(1);
                  else return;
                }
                console.log('Saved slide %d with %d slides', slide.step,slide.slides.length);
                if(exit) process.exit();
                else return;
              })
            });
          });
        });
      });
    });
  });
}