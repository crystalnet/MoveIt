import {Component, OnDestroy, OnInit} from '@angular/core';
import {Router, RouterEvent} from '@angular/router';
import {AlertController, NavController, Platform} from '@ionic/angular';

import {AuthenticateService} from '../../services/authentication/authentication.service';
import {Observable} from 'rxjs';
import {UserService} from 'src/app/services/user/user.service';
import {TrackingService} from '../../services/tracking/tracking.service';
import {ActionLog} from '../../model/actionLog';
import {FCM} from 'cordova-plugin-fcm-with-dependecy-updated/ionic/ngx';
import {INotificationPayload} from 'cordova-plugin-fcm-with-dependecy-updated';

@Component({
    selector: 'app-menu',
    templateUrl: './menu.page.html',
    styleUrls: ['./menu.page.scss'],
})
export class MenuPage implements OnInit, OnDestroy {

    public hasPermission: boolean;
    public token: string;
    public pushPayload: INotificationPayload;


    constructor(private router: Router, private auth: AuthenticateService, private userService: UserService, private fcm: FCM,
                private navCtrl: NavController, public alertController: AlertController, private trackingService: TrackingService,
                private platform: Platform) {
        this.router.events.subscribe((event: RouterEvent) => {
            if (event && event.url) {
                this.selectedPath = event.url;
            }
        });

        this.username = userService.getUsername(); // The username is just the observable
        // If a new value is received, we have to manually update the pages object so that Angular notices the change
        this.username.subscribe(username => this.updatePages(username));

        this.initializeFCM();
    }

    // pages = [
    //     {
    //         title: 'Dashboard',
    //         url: '/menu/dashboard'
    //     },
    //     {
    //         title: 'Information',
    //         url: '/menu/information'
    //     }
    // ];
    pages = [];

    username: Observable<string>;
    selectedPath = '';

    ngOnInit() {
        this.trackingService.startRecordingViewTime('menu');
    }

    ngOnDestroy() {
        this.trackingService.stopRecordingViewTime('menu');
    }

    logout() {
        this.trackingService.stopRecordingViewTime('menu');
        this.auth.logoutUser();
    }

    /**
     * Update the pages of the menu
     *
     * This method updates the whole pages array when there is a new username available. This is necessary, because
     * Angular cannot detect changes in the elements of the array.
     *
     * @param username the new username
     */
    updatePages(username) {
        this.pages.push({title: 'My Profile', url: '/menu/profile'});
    }

    initializeFCM() {
        this.platform.ready().then(() => {
            console.log('FCM: setup started');

            if (!this.platform.is('cordova')) {
                console.log('FCM: platform is ', this.platform);
                return;
            }
            console.log('FCM: In cordova platform');

            console.log('FCM: getting current token');
            this.fcm.getToken().then(
                result => {
                    console.log(result);
                    this.token = result;
                    this.userService.changeUserToken(result);
                },
                err => console.log(err)
            ).finally(() => console.log('getToken result: ', this.token));

            console.log('FCM: Subscribing to token updates');
            this.fcm.onTokenRefresh().subscribe((newToken) => {
                this.token = newToken;
                this.userService.changeUserToken(newToken);
                console.log('onTokenRefresh received event with: ', newToken);
            });

            // Only necessary for iOS
            this.fcm.requestPushPermission().then(
                result => {
                    console.log(result);
                    this.hasPermission = result;
                },
                err => console.log(err)
            ).finally(() => console.log('getToken result: ', this.token));

            console.log('Subscribing to new notifications');
            this.fcm.onNotification().subscribe((payload) => {
                this.pushPayload = payload;
                console.log('onNotification received event with: ', payload);
                this.handleNotification(payload);
            });

            console.log('Subscribing to initial push notifications');
            this.fcm.getInitialPushPayload().then(
                payload => {
                    console.log(payload);
                    this.pushPayload = payload;
                    this.handleNotification(payload);
                },
                err => console.log(err)
            ).finally(() => console.log('getInitialPushPayload result: ', this.pushPayload));
        });
    }

    async handleNotification(payload) {
        if (!payload) {
            return;
        }

        if (payload.wasTapped) {
            console.log('FCM: Received in background ' + payload);
            this.trackingService.logAction(new ActionLog('entered-app-from-notification', payload.type));
        } else {
            console.log('FCM: Received in foreground ' + payload);
        }
        console.log(payload);
        const alert = await this.alertController.create({
            header: payload.header,
            message: payload.text,
            buttons: [
                {
                    text: payload.rejectButtonText,
                    handler: () => {
                        this.trackingService.setReaction(payload.id, payload.type, 'negative').then(
                            res => console.log(res),
                            err => console.log(err)
                        );
                        console.log('FCM: Notification dismissed');
                    }
                }, {
                    text: payload.confirmButtonText,
                    handler: () => {
                        this.trackingService.setReaction(payload.id, payload.type, 'positive').then(
                            res => console.log(res),
                            err => console.log(err)
                        );
                        console.log('FCM: Notification accepted');
                    }
                }
            ]
        });
        if (payload.target) {
            await this.navCtrl.navigateForward(payload.target);
        }
        await alert.present();
    }
}
