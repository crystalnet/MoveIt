import {Injectable} from '@angular/core';
import {AngularFireDatabase} from '@angular/fire/database';
import * as firebase from 'firebase/app';
import 'firebase/auth';
import {ViewLog} from '../../model/viewLog';
import {ActionLog} from '../../model/actionLog';
import {Reaction} from '../../model/reaction';
import {Platform} from '@ionic/angular';
import moment = require('moment');

@Injectable({
    providedIn: 'root'
})
export class TrackingService {
    currentView: string;
    lastView: string;
    views = {};

    constructor(private fireDatabase: AngularFireDatabase, private platform: Platform) {
        platform.pause.subscribe(() => {
            console.log('APP PAUSED: ', new Date());
            this.stopRecordingViewTime(this.currentView);
        });
        platform.resume.subscribe(() => {
            console.log('APP RESUMED: ', new Date());
            this.views[this.currentView].startTime = new Date();
            // outside the app
            // what you need to do
        });
    }

    startRecordingViewTime(view: string) {
        const viewLog = new ViewLog();
        viewLog.view = view;
        this.views[view] = viewLog;
        this.lastView = this.currentView;
        this.currentView = view;
        console.log(viewLog);
        return viewLog;
    }

    stopRecordingViewTime(view?: string) {
        this.views[view].endTime = new Date();
        this.logViewTime(this.views[view]);
        console.log(this.views[view]);
    }

    logViewTime(viewLog: ViewLog) {
        if (firebase.auth().currentUser) {
            this.fireDatabase.database.ref('/tracking/' + firebase.auth().currentUser.uid + '/viewLogs/' + viewLog.view)
                .push(viewLog.toFirebaseObject());
        } else {
            console.log('no log created for ' + viewLog.view + ', because user is not logged in');
        }
    }

    logAction(actionLog: ActionLog) {
        return this.fireDatabase.database.ref('/tracking/' + firebase.auth().currentUser.uid + '/actionLogs')
            .push(actionLog.toFirebaseObject());
    }

    logInAppNotification(notificationType: string, response: string) {
        this.logReaction('inApp-notification', notificationType, response);
    }

    logPushNotification(notificationId: string, notificationType: string, response: string) {
        this.logReaction('push-notification', notificationType, response, notificationId);
    }

    logReaction(type: string, notificationType: string, response: string, notificationId: any = moment().tz('Europe/Berlin').valueOf()) {
        const reaction = new Reaction(type, notificationType, response, notificationId.toString());
        this.fireDatabase.database
            .ref('/tracking/' + firebase.auth().currentUser.uid + '/reactions/' +  notificationId).set(reaction.toFirebaseObject());
    }
}
