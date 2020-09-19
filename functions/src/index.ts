//import * as functions from 'firebase-functions';

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
// export const helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

let functions = require('firebase-functions');

let admin = require('firebase-admin');

admin.initializeApp(functions.config().firebase);

exports.automaticNotifications = functions.pubsub.schedule('every 15 minutes from 6:00 to 3:00').onRun((context: any) => {
    let time = new Date();
    time = new Date(time.getTime() + 120 * 60 * 1000);
    console.log('System Time: ', time);
    time.setMinutes(time.getMinutes() - (time.getMinutes() % 15)); // Round down to last quarter hour (00, 15, 30 or 45)
    console.log('checking path ' + '/times/' + time.getHours() + '/' + time.getMinutes());
    return admin.database().ref('/times/' + time.getHours() + '/' + time.getMinutes()).once('value').then(
        (snapshot: any) => {
            const result = snapshot.val();
            if (!result) {
                console.log('No results for this time: ', time.toISOString(), result);
                return;
            }

            const promises = [];
            for (const k of Object.keys(result)) {
                const uid = result[k as keyof typeof result];
                console.log('result for ', uid);

                const randomization = Math.random();
                let data = Promise.resolve(new NotificationData());
                // if (randomization < 0.25) {
                if (randomization < 1) {
                    data = generateLeaderboardNotification(uid);
                } else if (randomization < 0.5) {
                    data = generateSocialfeedNotification(uid);
                } else {
                    continue;
                }

                promises.push(data.then(
                    (res: NotificationData) => {
                        const notification = new UserNotification(uid, res);
                        return notification.getUserToken().then(
                            () => notification.send(),
                            (err: any) => console.log(err)
                        );
                    },
                    (err: any) => console.log(err)
                ));
            }
            return Promise.all(promises);
        },
        (err: any) => {
            console.log(err);
            return;
        }
    );
});


function generateLeaderboardNotification(uid: string) {
    return admin.database().ref('/leaderboard/absolute/weeklyActiveMinutes').once('value').then(
        (snap: any) => {
            const result = snap.val();
            if (!result) {
                return;
            }
            const ranks = Object.keys(result).sort((a, b) => result[a] - result[b]);
            const userRank = ranks.indexOf(uid);

            const data = new NotificationData();
            data.header = userRank.toString() + 'to go';
            data.text = 'Your rank is ' + userRank.toString();
            return data;
        },
        (err: any) => console.log(err)
    );
}

function generateSocialfeedNotification(uid: string) {
    return Promise.resolve(new NotificationData());
}


exports.sendNotificationTrophyWin = functions.database.ref('/wins/{userId}').onWrite((event: any, context: any) => {

    //get the userId of the person receiving the notification because we need to get their token
    // console.log("context: ");
    // console.log(context);
    // console.log("event: ");
    // console.log(event);
    const winnerId = context.params.userId;
    console.log('winnerId: ', winnerId);

    //get the token of the user receiving the message
    return admin.database().ref('/users/' + winnerId).once('value').then(
        (snap: {
            child: (arg0: string) =>
                {
                    (): any;
                    new(): any;
                    val: {
                        (): any;
                        new(): any;
                    };
                };
        }) => {
            const token = snap.child('token').val();
            console.log('token: ', token);

            // we have everything we need
            // Build the message payload and send the message
            console.log('Construction the notification message.');
            const payload = {
                notification: {
                    title: 'You reached your goal!',
                    body: 'Congratulations - you reached your goal!',
                    sound: 'default',
                    click_action: 'FCM_PLUGIN_ACTIVITY'
                },
                data: {
                    header: 'Congratulations!',
                    text: 'Congratulations! You have reached your goal'
                }
            };
            return admin.messaging().sendToDevice(token, payload)
                .then(function(response: any) {
                    console.log('Successfully sent message:', response);
                })
                .catch(function(error: any) {
                    console.log('Error sending message:', error);
                });
        });
});

exports.sendNotification = functions.https.onCall((data: any, context: any) => {
    // Message text passed from the client.
    const token = data.token;
    const uid = data.uid;
    const title = data.title || 'You reached your goal!';
    const body = data.body || 'Congratulations - you reached your goal!';
    const id = data.id || (new Date()).getTime();
    const type = data.type || '';
    const target = data.target || '';
    const confirmButtonText = data.confirmButtonText || '';
    const rejectButtonText = data.rejectButtonText || '';
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

exports.resetLeaderboard = functions.pubsub.schedule('every 24 hours').onRun((context: any) => {
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
                    dailyModerate: result,
                    dailyVigorous: result,
                    dailyWeight: result,
                    weeklyModerate: result,
                    weeklyVigorous: result,
                    weeklyWeight: result,
                };

                console.log(goals);

                admin.database().ref('/leaderboard/absolute').set(goals);
                admin.database().ref('/leaderboard/relative').set(goals);
                admin.database().ref('/leaderboard/weeklyActiveMinutes').set(goals);

            },
            (err: any) => console.log(err));
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
        this.id = id || (new Date()).getTime().toString();
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
        console.log('retrieving token');
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
            notification: this.data.type,
            time: this.data.id,
            response: 'negative'
        };
        admin.database().ref('/tracking/' + this.uid + '/reactions/' + this.data.id).set(dbNotification).then(
            (res: any) => console.log(res),
            (err: any) => console.log(err)
        );
    }

    send() {
        if (!this.token) {
            console.log('No token set: ', this.token);
            return;
        }
        this.generatePayload();
        console.log(this.payload);

        this.createDbEntry();

        return admin.messaging().sendToDevice(this.token, this.payload)
            .then(function(response: any) {
                console.log('Successfully sent message:', response);
            })
            .catch(function(error: any) {
                console.log('Error sending message:', error);
            });
    }
}

