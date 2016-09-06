var http = require('http');

module.exports = function(clientKey) {
    return new function(clientKey) {
        this.params = {
            host: 'api.anti-captcha.com',
            clientKey: clientKey,

            websiteUrl: null,
            websiteKey: null,
            proxyType: 'http',
            proxyAddress: null,
            proxyPort: null,
            proxyLogin: null,
            proxyPassword: null,
            userAgent: '',
        };

        var connectionTimeout = 20,
            firstAttemptWaitingInterval = 5,
            normalWaitingInterval = 2;

        this.createTask = function (cb) {
            var postData = {
                clientKey: this.params.clientKey,
                task: this.getPostData()
            };

            this.jsonPostRequest('createTask', postData, function (err, jsonResult) {
                if (err) {
                    return cb(err);
                }

                // Task created
                var taskId = jsonResult.taskId;

                cb(null, taskId);
            });
        };
        
        this.getTaskSolution = function (taskId, cb, currentAttempt = 0) {
            var postData = {
                clientKey: this.params.clientKey,
                taskId: taskId
            };

            var waitingInterval;
            if (currentAttempt == 0) {
                waitingInterval = firstAttemptWaitingInterval;
            } else {
                waitingInterval = normalWaitingInterval;
            }

            console.log('Waiting %s seconds', waitingInterval);

            var that = this;

            setTimeout(function() {
                that.jsonPostRequest('getTaskResult', postData, function (err, jsonResult) {
                    if (err) {
                        return cb(err);
                    }

                    if (jsonResult.status == 'processing') {
                        return that.getTaskSolution(taskId, cb, currentAttempt + 1);
                    } else if (jsonResult.status == 'ready') {
                        return cb(null, jsonResult.solution.gRecaptchaResponse);
                    }
                });
            }, waitingInterval * 1000);
        };

        this.getPostData = function() {
            return {
                type:           'NoCaptchaTask',
                websiteURL:     this.params.websiteUrl,
                websiteKey:     this.params.websiteKey,
                proxyType:      this.params.proxyType,
                proxyAddress:   this.params.proxyAddress,
                proxyPort:      this.params.proxyPort,
                proxyLogin:     this.params.proxyLogin,
                proxyPassword:  this.params.proxyPassword,
                userAgent:      this.params.userAgent
            };
        };

        this.jsonPostRequest = function(methodName, postData, cb) {
            // http request options
            var options = {
                hostname: this.params.host,
                path: '/' + methodName,
                method: 'POST',
                headers: {
                    'accept-encoding':  'gzip,deflate',
                    'content-type':     'application/json; charset=utf-8',
                    'accept':           'application/json',
                    'content-length':   Buffer.byteLength(JSON.stringify(postData))
                }
            };

            // console.log(options);
            // console.log(JSON.stringify(postData));

            var req = http.request(options, function(response) { // on response
                var str = '';

                // another chunk of data has been recieved, so append it to `str`
                response.on('data', function (chunk) {
                    str += chunk;
                });

                // the whole response has been recieved, so we just print it out here
                response.on('end', function () {
                    // console.log(str);

                    try {
                        var jsonResult = JSON.parse(str);
                    } catch (err) {
                        return cb(err);
                    }

                    if (jsonResult.errorId) {
                        return cb(new Error(jsonResult.errorDescription, jsonResult.errorCode));
                    }

                    return cb(null, jsonResult);
                });
            });

            // send post data
            req.write(JSON.stringify(postData));
            req.end();

            // timeout in milliseconds
            req.setTimeout(connectionTimeout * 1000);
            req.on('timeout', function() {
                console.log('timeout');
                req.abort();
            });

            // After timeout connection throws Error, so we have to handle it
            req.on('error', function(err) {
                console.log('error');
                return cb(err);
            });

            return req;
        };

        //proxy access parameters
        this.setWebsiteURL = function (value) {
            this.params.websiteUrl = value;
        };

        this.setWebsiteKey = function (value) {
            this.params.websiteKey = value;
        };

        this.setProxyType = function (value) {
            this.params.proxyType = value;
        };

        this.setProxyAddress = function (value) {
            this.params.proxyAddress = value;
        };

        this.setProxyPort = function (value) {
            this.params.proxyPort = value;
        };

        this.setProxyLogin = function (value) {
            this.params.proxyLogin = value;
        };

        this.setProxyPassword = function (value) {
            this.params.proxyPassword = value;
        };

        this.setUserAgent = function (value) {
            this.params.userAgent = value;
        };

    }(clientKey);
};