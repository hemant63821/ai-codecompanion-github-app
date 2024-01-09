// Using callbacks instead of Promises

var OpenAI = require('openai');

module.exports = function (app) {
  var openai = new OpenAI({
    key:  process.env.OPENAI_API_KEY,
    apiBaseUrl: process.env.OPENAI_API_ENDPOINT || "https://api.openai.com/v1",
  });

  app.on("issues.opened", function (context) {
    var issue = context.payload.issue;
    var prompt = 'Please provide insights on the following issue titled "' + issue.title + '" with details:\n\n' + issue.body + '\n\n';

    openai.Chat.create({
      model: process.env.MODEL || 'gpt-3.5-turbo',
      messages: [{ role: 'system', content: 'You are a helpful assistant.' }, { role: 'user', content: prompt }],
    }, function (error, response) {
      if (error) {
        console.error('Error making API request:', error.message);
      } else {
        var message = 'Hi 🙏🏻 ' + issue.user.login +
          '\n### 🤖 AI Insights\n' +
          response.choices[0]?.message?.content + '\n';

        var issueComment = context.issue({
          body: message,
        });

        context.octokit.issues.createComment(issueComment, function (error) {
          if (error) {
            console.error('Error creating comment:', error.message);
          } else {
            app.log.info('Comment created successfully');
          }
        });
      }
    });
  });


  app.on("pull_request.opened", function (context) {
    var pullRequest = context.payload.pull_request;

    
    context.octokit.pulls.get({
        owner: context.repo.owner,
        repo: context.repo.repo,
        pull_number: pullRequest.number,
        mediaType: {
            format: 'diff'
        }
    }, function (error, result) {
        if (error) {
            console.error('Error getting pull request diff:', error.message);
            return;
        }

        var prompt = 'Code review for pull request titled "' + pullRequest.title + '":\n\n' + result.data;

        openai.Chat.create({
            model: process.env.MODEL || 'gpt-3.5-turbo',
            messages: [{ role: 'system', content: 'You are a helpful assistant. Below is a code patch, please help me do a brief code review on it. Any bug risks and/or improvement suggestions are welcome:;' }, { role: 'user', content: prompt }],
        }, function (error, response) {
            if (error) {
                console.error('Error making API request:', error.message);
            } else {
                var message = 'Hi 🙏🏻 ' + pullRequest.user.login +
                    '\n### 🤖 AI Code Review\n' +
                    response.choices[0] ? response.choices[0].message.content : '' + '\n';

                var prComment = context.issue({
                    body: message,
                });

               
                context.octokit.issues.createComment(prComment, function (error) {
                    if (error) {
                        console.error('Error creating comment:', error.message);
                    } else {
                        console.log('Comment created successfully');
                    }
                });
            }
        });
    });
});


  return {
    info: function () {
    //   app.log.info('test');
    },
  };
};
