//import * as functions from 'firebase-functions';

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
// export const helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

import {isObject} from 'util';

const moment = require('moment-timezone');

const functions = require('firebase-functions');

const admin = require('firebase-admin');

admin.initializeApp(functions.config().firebase);

exports.automaticNotifications = functions
    .region('europe-west1')
    .pubsub.schedule('every 15 minutes')
    .timeZone('Europe/Berlin')
    .onRun((context: any) => {
        const time = moment().tz('Europe/Berlin');
        console.log('System Time: ', time.toLocaleString());
        time.subtract('minutes', time.get('minutes') % 15); // Round down to last quarter hour (00, 15, 30 or 45)
        console.log('checking path ' + '/times/.../' + time.get('hours') + '/' + time.get('minutes'));

        const returns = [];
        returns.push(admin.database().ref('/times/social/' + time.get('hours') + '/' + time.get('minutes')).once('value').then(
            (snapshot: any) => {
                const result = snapshot.val();
                if (!result) {
                    console.log('No results for this time: ', time.toString(), result);
                    return;
                }

                const promises = [];
                for (const k of Object.keys(result)) {
                    const uid = result[k as keyof typeof result];
                    let success = false;
                    console.log('result for ', uid);

                    const randomization = Math.random();
                    console.log('randomization is ' + randomization);
                    let data = Promise.resolve(new NotificationData());
                    try {
                        if (randomization < 0.25) {
                            // if (randomization > 1) {
                            data = generateLeaderboardNotification(uid);
                            success = true;
                        } else if (randomization < 0.50) {
                            // } else if (randomization < 1) {
                            data = generateSocialfeedNotification(uid);
                            success = true;
                        } else {
                            throw new Error('randomization result: no notification. continuing to next key. current uid ' + uid);
                        }
                    } catch (err) {
                        console.log('received error' + err);

                        let type = 'default';
                        if (randomization < 0.25) {
                            type = 'leaderboard-notification';
                        } else if (randomization < 0.5) {
                            // } else if (randomization < 1) {
                            type = 'socialfeed-notification';
                        }

                        const dbNotification = {
                            notificationType: type,
                            type: 'push-notification',
                            time: time.valueOf().toString(),
                            response: 'not send',
                            error: err
                        };
                        admin.database().ref('/tracking/' + uid + '/reactions/' + moment().tz('Europe/Berlin').valueOf().toString()).set(dbNotification).then(
                            () => console.log('created db entry', dbNotification),
                            (err: any) => console.log(err)
                        );
                        continue;
                    }
                    if (success) {
                        console.log('preparing to send notification for ', uid);

                        promises.push(data.then(
                            (res: NotificationData) => {
                                const notification = new UserNotification(uid, res);
                                return notification.send();
                            },
                            (err: any) => console.log(err)
                        ));
                    }
                }
                return Promise.all(promises);
            },
            (err: any) => {
                console.log(err);
                return;
            }
        ));

        returns.push(admin.database().ref('/times/progress/' + time.get('hours') + '/' + time.get('minutes')).once('value').then(
            (snapshot: any) => {
                const result = snapshot.val();
                if (!result) {
                    console.log('No results for this time: ', time.toString(), result);
                    return;
                }

                const promises = [];
                for (const k of Object.keys(result)) {
                    const uid = result[k as keyof typeof result];
                    let success = false;
                    console.log('result for ', uid);

                    const randomization = Math.random();
                    console.log('randomization is ' + randomization);
                    let data = Promise.resolve(new NotificationData());
                    try {
                        if (randomization < 0.25) {
                            // if (randomization > 1) {
                            data = dailyProgressNotification(uid);
                            success = true;
                        } else if (randomization < 0.50) {
                            data = weeklyProgressNotification(uid);
                            success = true;
                        } else {
                            throw new Error('randomization result: no notification. continuing to next key. current uid ' + uid);
                        }
                    } catch (err) {
                        console.log('received error' + err);

                        let type = 'default';
                        if (randomization < 0.25) {
                            type = 'daily-progress-notification';
                        } else if (randomization < 0.5) {
                            // } else if (randomization < 1) {
                            type = 'weekly-progress-notification';
                        }

                        const dbNotification = {
                            notificationType: type,
                            type: 'push-notification',
                            time: time.valueOf().toString(),
                            response: 'not send',
                            error: err
                        };
                        admin.database().ref('/tracking/' + uid + '/reactions/' + moment().tz('Europe/Berlin').valueOf().toString()).set(dbNotification).then(
                            () => console.log('created db entry', dbNotification),
                            (err: any) => console.log(err)
                        );
                        continue;
                    }
                    if (success) {
                        console.log('preparing to send notification for ', uid);

                        promises.push(data.then(
                            (res: NotificationData) => {
                                const notification = new UserNotification(uid, res);
                                return notification.send();
                            },
                            (err: any) => console.log(err)
                        ));
                    }
                }
                return Promise.all(promises);
            },
            (err: any) => {
                console.log(err);
                return;
            }
        ));
    });


function generateLeaderboardNotification(uid: string) {
    return admin.database().ref('/leaderboard/absolute/weekly-active').once('value').then(
        (snap: any) => {
            const result = snap.val();
            if (!result) {
                console.log('no results for weekly-active');
                throw new Error('no results for weekly-active');
            }
            const ranks = Object.keys(result).sort((a, b) => result[b] - result[a]);
            const userRank = ranks.indexOf(uid) + 1;

            const data = new NotificationData();
            data.header = 'Your rank is ' + userRank.toString();
            data.text = 'Check the leadboard to see how you compare to others!';
            data.target = 'menu/leaderboard/leaderboard/detail';
            data.type = 'leaderboard-notification';
            return data;
        },
        (err: any) => console.log(err)
    );
}

function generateSocialfeedNotification(uid: string) {
    return admin.database().ref('/posts/users/' + uid).orderByKey().limitToLast(1).once('value').then((snap: any) => {
            const result = snap.val();
            if (!result) {
                console.log('no results for ', uid);
                throw new Error('no results for ' + uid);
            }
            const postId = Object.keys(result)[0];
            const group = result[postId];

            const randomization = Math.random();
            if (randomization < 0.5) {
                // if (randomization > 1) {
                return likeNotification(uid, group, postId);
            } else {
                return commentNotification(uid, group, postId);
            }
        },
        (err: any) => console.log(err));
}

function likeNotification(uid: string, group: string, postId: string) {
    return admin.database().ref('/posts/groups/' + group + '/' + postId + '/likes').once('value').then((snap: any) => {
            const result = snap.val();

            const botUserId = 'mJS7f7DPWgdhi0gKz2RmrvZkiAq1@';
            if (!result || Array.isArray(result)) {
                admin.database().ref('/posts/groups/' + group + '/' + postId + '/likes').set([botUserId]);
            } else {
                if (botUserId in result) {
                    console.log('user exists already in likes');
                } else {
                    result.push(botUserId);
                }
                admin.database().ref('/posts/groups/' + group + '/' + postId + '/likes').set(result);
            }

            const data = new NotificationData();
            data.header = 'Your activity is being liked!';
            data.text = 'Your post was liked by someone, go check it out!';
            data.target = '/menu/socialfeed/socialfeed/detail';
            data.type = 'like-socialfeed-notification';
            return data;
        },
        (err: any) => console.log(err));
}

function commentNotification(uid: string, group: string, postId: string) {
    return admin.database().ref('/posts/groups/' + group + '/' + postId + '/comments').once('value').then((snap: any) => {
            const result = snap.val();

            const botUserId = 'mJS7f7DPWgdhi0gKz2RmrvZkiAq1@';
            const botUserName = 'Kon Sti';
            const comment = {
                createdAt: moment().tz('Europe/Berlin').valueOf().toString(),
                text: 'Well done',
                user: botUserName,
                uid: botUserId
            };

            if (!result || Array.isArray(result)) {
                admin.database().ref('/posts/groups/' + group + '/' + postId + '/comments').set([comment]);
            } else {
                result.push(comment);
                admin.database().ref('/posts/groups/' + group + '/' + postId + '/comments').set(result);
            }

            const data = new NotificationData();
            data.header = 'Your activity received comments!';
            data.text = 'Your post was commented by someone, go check it out!';
            data.target = '/menu/socialfeed/socialfeed/detail';
            data.type = 'comment-socialfeed-notification';
            return data;
        },
        (err: any) => console.log(err));
}

function dailyProgressNotification(uid: string) {
    return admin.database().ref('/leaderboard/relative/daily-active/' + uid).once('value').then((snap: any) => {
            const progress = snap.val();

            const data = new NotificationData();
            data.header = 'Daily Goal Progress';
            data.text = 'You have reached ' + Math.max(100, Math.round(progress*100)).toString() + '% of your daily goal with ' + Math.min(0, Math.round((1-progress)*100)).toString() + '% more to go!s';
            data.target = '/menu/progress/progress/detail';
            data.type = 'daily-progress-notification';
            return data;
        },
        (err: any) => console.log(err));
}


function weeklyProgressNotification(uid: string) {
    return admin.database().ref('/leaderboard/relative/weekly-active/' + uid).once('value').then((snap: any) => {
            const progress = snap.val();

            const data = new NotificationData();
            data.header = 'Weekly Goal Progress';
            data.text = 'You have reached ' + Math.max(100, Math.round(progress*100)).toString() + '% of your weekly goal with ' + Math.min(0, Math.round((1-progress)*100)).toString() + '% more to go!';
            data.target = '/menu/progress/progress/detail';
            data.type = 'weekly-progress-notification';
            return data;
        },
        (err: any) => console.log(err));
}

exports.progressNotification = functions.database.ref('/leaderboard/relative/weekly-active/{userId}')
    .onWrite((event: any, context: any) => {

        // NOT ACTIVE
        return;

        const before = event.before.val();
        const after = event.after.val();
        console.log('triggered with new val ', after, ' old val', before);
        if (before && after && before < after) {
            const data = new NotificationData();

            const randomization = Math.random();
            if (randomization < 0.5) {
                if (before < 0.25 && after >= 0.25) {
                    data.header = 'You reached 25% of your goal!';
                } else if (before < 0.5 && after >= 0.5) {
                    data.header = 'You reached 50% of your goal!';
                } else if (before < 0.75 && after >= 0.75) {
                    data.header = 'You reached 75% of your goal!';
                } else {
                    return;
                }
                data.text = 'Well done! You\'re making good progress.';
                data.type = 'optimistic-progress-notification';
            } else {
                if (before < 0.25 && after >= 0.25) {
                    data.header = 'You have 75% of your goal left!';
                } else if (before < 0.5 && after >= 0.5) {
                    data.header = 'You have 50% of your goal left!';
                } else if (before < 0.75 && after >= 0.75) {
                    data.header = 'You have 25% of your goal left!';
                } else {
                    return;
                }
                data.text = 'Work harder! Increase your effort to reach your goal.';
                data.type = 'pessimistic-progress-notification';
            }
            data.target = '/menu/progress/progress/detail';
            const notification = new UserNotification(context.params.userId, data);
            return notification.send();
        } else {
            return Promise.resolve('performance value decreased not increased');
        }
    });


exports.sendNotificationTrophyWin = functions.database.ref('/wins/{userId}/{goal}').onWrite((event: any, context: any) => {
    // get the userId of the person receiving the notification because we need to get their token
    // console.log("context: ");
    // console.log(context);
    // console.log("event: ");
    // console.log(event);
    const uid = context.params.userId;
    const goalName = context.params.goal;
    const operation = context.eventType;
    console.log('uid: ', uid);
    console.log('goal: ', goalName);

    if (!goalName.includes('active') || operation.includes('delete')) {
        console.log('no active goal but: ', goalName);
        return;
    }

    const promises = [];
    // we have everything we need
    // Build the message payload and send the message
    const data = new NotificationData();
    const name = goalName.split('-')[0];
    data.header = `${name.charAt(0).toUpperCase() + name.slice(1)} goal won!`;
    data.text = `Congratulations, you achieved your ${name} goal!`;
    data.type = 'goal-win-notification';

    const notification = new UserNotification(uid, data);
    promises.push(notification.send());

    promises.push(incrementNWins(uid));
    return Promise.all(promises);
});

function incrementNWins(uid: string) {
    return admin.database().ref('/leaderboard/nWins/' + uid).transaction((res: any) => {
        return res + 1;
    }, (err: any) => console.log(err));
}

exports.sendNotification = functions.https.onCall((data: any, context: any) => {
    // Message text passed from the client.
    const token = data.token;
    const uid = data.uid;
    const title = data.title || 'You reached your goal!';
    const body = data.body || 'Congratulations - you reached your goal!';
    const id = data.id || (new Date()).getTime();
    const type = data.type || 'custom-notification';
    const target = data.target || '';
    const confirmButtonText = data.confirmButtonText || 'Nice';
    const rejectButtonText = data.rejectButtonText || 'Dismiss';
    // Authentication / user information is automatically added to the request.
    // const uid = context.auth.uid;
    // const name = context.auth.token.name || null;
    // const picture = context.auth.token.picture || null;
    // const email = context.auth.token.email || null;

    const payload_data = {
        header: title,
        text: body,
        type: type,
        id: id,
        target: target,
        confirmButtonText: confirmButtonText,
        rejectButtonText: rejectButtonText
    };

    const notification = new UserNotification(uid, payload_data, token);
    return notification.send();
});

exports.resetLeaderboard = functions
    .region('europe-west1')
    .pubsub.schedule('0 0 * * 1')
    .timeZone('Europe/Berlin')
    .onRun((context: any) => {
        return admin.database().ref('/users/').once('value')
            .then((snap: any) => {
                    const result = snap.val();
                    if (!result) {
                        return;
                    }

                    for (const user of Object.keys(result)) {
                        result[user as keyof typeof result] = 0;
                    }

                    const goals = {
                        'daily-moderate': result,
                        'daily-vigorous': result,
                        'daily-active': result,
                        'weekly-moderate': result,
                        'weekly-vigorous': result,
                        'weekly-active': result,
                    };

                    console.log(goals);

                    admin.database().ref('/leaderboard/absolute').set(goals);
                    admin.database().ref('/leaderboard/relative').set(goals);
                },
                (err: any) => console.log(err));
    });

exports.dailyCleanUp = functions
    .region('europe-west1')
    .pubsub.schedule('0 0 * * *')
    .timeZone('Europe/Berlin')
    .onRun((context: any) => {
        let goals: any;
        let leaderboard: any;
        let users: any;
        let publicUserData: any;
        let goalHistory: any;
        const promises = [];
        console.log('dailyCleanUp: system time ' + moment().tz('Europe/Berlin').toISOString(true));

        promises.push(admin.database().ref('/goals/').once('value')
            .then((snap: any) => {
                goals = snap.val();
            }));

        promises.push(admin.database().ref('/leaderboard/').once('value')
            .then((snap: any) => {
                leaderboard = snap.val();
            }));

        promises.push(admin.database().ref('/users/').once('value')
            .then((snap: any) => {
                users = snap.val();
            }));

        promises.push(admin.database().ref('/publicUserData/').once('value')
            .then((snap: any) => {
                publicUserData = snap.val();
            }));

        promises.push(admin.database().ref('/goalHistory/').once('value')
            .then((snap: any) => {
                goalHistory = snap.val();
            }));

        return Promise.all(promises).then(
            () => {
                logGoalProgress(goalHistory, goals);
                resetDailyGoals(goals, leaderboard);
                updatePublicUserData(users, publicUserData);

                const returnPromises = [];
                returnPromises.push(admin.database().ref('/goals/').set(goals));
                returnPromises.push(admin.database().ref('/leaderboard/').set(leaderboard));
                returnPromises.push(admin.database().ref('/users/').set(users));
                returnPromises.push(admin.database().ref('/publicUserData/').set(publicUserData));
                returnPromises.push(admin.database().ref('/goalHistory/').set(goalHistory));

                return Promise.all(returnPromises);
            },
            err => console.log(err)
        );
    });

function logGoalProgress(goalHistory: any, goals: any) {
    if (!goalHistory || !goals || !isObject(goalHistory) || !isObject(goals)) {
        console.log('goalHistory or goals not set ', goals);
        return;
    }

    // Get end of yesterday
    const time = moment().tz('Europe/Berlin').subtract(1, 'day').endOf('day');

    for (const user of Object.keys(goals)) {
        goalHistory[user][time.valueOf()] = {};
        for (const goal of Object.keys(goals[user])) {
            goalHistory[user][time.valueOf()][goal] = goals[user][goal];
        }
    }

    // Objects are edited in place, therefore no return value is necessary
    return;
}

function resetDailyGoals(goals: any, leaderboard: any) {
    if (!goals || !leaderboard || !isObject(goals) || !isObject(leaderboard)) {
        console.log('goals or leaderboard not set ', goals, leaderboard);
        return;
    }

    for (const user of Object.keys(goals)) {
        for (const goal of Object.keys(goals[user])) {
            const element = goals[user][goal];
            if (goal.split('-')[0] === 'daily') {
                element.relative = 0;
                element.current = 0;
            }
        }
    }

    const dailyGoals = ['daily-active', 'daily-moderate', 'daily-vigorous'];
    const metrics = ['relative', 'absolute'];
    for (const metric of metrics) {
        for (const goal of dailyGoals) {
            for (const user of Object.keys(leaderboard[metric][goal])) {
                leaderboard[metric][goal][user] = 0;
            }
        }
    }

    // Objects are edited in place, therefore no return value is necessary
    return;
}

function updatePublicUserData(users: any, publicUserData: any) {
    if (!users || !publicUserData || !isObject(users) || !isObject(publicUserData)) {
        console.log('users or publicUserData not set ', users, publicUserData);
        return;
    }

    for (const user of Object.keys(users)) {
        const birthday = new Date(users[user].birthday);
        const now = new Date();
        if (birthday.getMonth() === now.getMonth() && birthday.getDate() === now.getDate()) {
            console.log('increased age', user);
            publicUserData[user].age = now.getFullYear() - birthday.getFullYear();
        }
    }

    // Objects are edited in place, therefore no return value is necessary
    return;
}

exports.setGoals = functions
    .region('europe-west1')
    .pubsub.schedule('0 9 * * 1')
    .timeZone('Europe/Berlin')
    .onRun((context: any) => {
        return admin.database().ref('/users/').once('value')
            .then((snap: any) => {
                const users = snap.val();
                const data = new NotificationData();
                data.header = 'Time for new goals';
                data.text = 'Adjust your goals based on your last week. Don\'t make them too easy :) Want to set goals now?';
                data.type = 'weekly-set-goals';
                data.target = '/menu/goals/goals/detail';
                data.confirmButtonText = 'Yes';
                data.rejectButtonText = 'No';
                for (const userKV of Object.entries(users)) {
                    console.log(userKV[0]);
                    const notification = new UserNotification(userKV[0], data);
                    notification.send();
                }

            });
    });


class NotificationData {
    header: string;
    text: string;
    type: string;
    id: string;
    target: string;
    confirmButtonText: string;
    rejectButtonText: string;

    constructor(header?: string, text?: string, type?: string, id?: string, target?: string, confirmButtonText?: string,
                rejectButtonText?: string) {
        this.header = header || 'New Notification';
        this.text = text || 'Lorem ipsum dolor sit amet.';
        this.id = id || moment().tz('Europe/Berlin').valueOf().toString();
        this.type = type || '';
        this.target = target || '';
        this.confirmButtonText = confirmButtonText || 'Nice';
        this.rejectButtonText = rejectButtonText || 'Dismiss';
    }
}

class UserNotification {
    uid: string;
    title: string;
    body: string;
    sound: string;
    click_action: string;
    data: NotificationData;
    token: string;
    payload: object;

    constructor(uid: string, data?: NotificationData, token?: string) {
        this.uid = uid;
        this.title = data ? data.header : 'New Notification';
        this.body = data ? data.text : 'Lorem ipsum dolor sit amet.';
        this.data = data || new NotificationData();
        this.sound = 'default';
        this.click_action = 'FCM_PLUGIN_ACTIVITY';
        this.token = token || '';
        this.payload = {};
    }

    getUserToken() {
        return new Promise((resolve, reject) => {
            admin.database().ref('/users/' + this.uid + '/token').once('value').then(
                (snapshot: any) => {
                    const result = snapshot.val();
                    console.log('retrieved token ', result, ' for uid ', this.uid);
                    this.token = result;
                    resolve(result);
                },
                (err: any) => {
                    console.log('could not retrieve token: ', err);
                    reject(err);
                }
            );
        });
    }

    generatePayload() {
        this.payload = {
            notification: {
                title: this.title,
                body: this.body,
                sound: this.sound,
                click_action: this.click_action
            },
            data: this.data
        };
        return this.payload;
    }

    createDbEntry() {
        const dbNotification = {
            type: 'push-notification',
            notificationType: this.data.type,
            time: this.data.id,
            response: 'not opened'
        };
        admin.database().ref('/tracking/' + this.uid + '/reactions/' + this.data.id).set(dbNotification).catch(
            (err: any) => console.log(err)
        );
    }

    send() {
        if (!this.uid) {
            console.log('No uid set: ', this.token);
            return;
        }

        let promise: any = Promise.resolve(this.token);
        if (!this.token) {
            promise = this.getUserToken();
        }

        return promise.then(
            (token: any) => {
                if (!token) {
                    console.log('Notification was not send because there is no token');
                    return;
                } else {
                    this.generatePayload();
                    this.createDbEntry();

                    return admin.messaging().sendToDevice(token, this.payload)
                        .then((response: any) => {
                            console.log('Successfully sent message to ' + this.uid);
                        })
                        .catch(function(error: any) {
                            console.log('Error sending message:', error);
                        });
                }

            },
            (err: any) => console.log(err)
        );
    }
}

