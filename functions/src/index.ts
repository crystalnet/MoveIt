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

exports.scheduledFunction = functions.pubsub.schedule('every 15 minutes from 6:00 to 3:00').onRun((context: any) => {
    let time = new Date();
    time = new Date(time.getTime() + 120 * 60 * 1000);
    console.log('System Time: ', time);
    time.setMinutes(time.getMinutes() - (time.getMinutes() % 15)); // Round down to last quarter hour (00, 15, 30 or 45)
    console.log('checking path ' + '/times/' + time.getHours() + '/' + time.getMinutes());
    admin.database().ref('/times/' + time.getHours() + '/' + time.getMinutes()).once('value').then(
        (snapshot: any) => {
            const result = snapshot.val();
            if (!result) {
                console.log('No results for this time: ', time.toISOString(), result);
                return;
            }

            for (const k of Object.keys(result)) {
                console.log('result for ', result[k as keyof typeof result]);
                const notification = new UserNotification(result[k as keyof typeof result], 'Whee', 'Automatic notification', {});
                notification.getUserToken().then(
                    () => notification.send(),
                    err => console.log(err)
                );
            }
        },
        (err: any) => console.log(err)
    );
    return null;
});

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

    const dbNotification = {
        notification: type,
        time: id,
        response: 'negative'
    };
    admin.database().ref('/tracking/' + uid + '/reactions/' + id).set(dbNotification).then(
        (res: any) => console.log(res),
        (err: any) => console.log(err)
    );

    const payload_data = {
        header: title,
        text: body,
        type: type,
        id: id,
        target: target,
        confirmButtonText: confirmButtonText,
        rejectButtonText: rejectButtonText
    };

    const notification = new UserNotification(uid, title, body, payload_data, token);
    return notification.send();
});

class UserNotification {
    uid: string;
    title: string;
    body: string;
    sound: string;
    click_action: string;
    data: object;
    token: string;
    payload: object;

    constructor(uid: string, title?: string, body?: string, data?: object, token?: string) {
        this.uid = uid;
        this.title = title || 'New Notification';
        this.body = body || 'Lorem ipsum dolor sit amet.';
        this.data = data || {};
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

    send() {
        if (!this.token) {
            console.log('No token set: ', this.token);
            return;
        }
        this.generatePayload();
        console.log(this.payload);
        return admin.messaging().sendToDevice(this.token, this.payload)
            .then(function(response: any) {
                console.log('Successfully sent message:', response);
            })
            .catch(function(error: any) {
                console.log('Error sending message:', error);
            });
    }
}
