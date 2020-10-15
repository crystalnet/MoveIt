import {Component, OnInit} from '@angular/core';
import {NotificationService} from '../../services/notification/notification.service';
import {UserService} from 'src/app/services/user/user.service';
import {User} from 'src/app/model/user';
import {ToastController} from '@ionic/angular';


@Component({
    selector: 'app-admin-dashboard-notifications',
    templateUrl: './admin-dashboard-notifications.page.html',
    styleUrls: ['./admin-dashboard-notifications.page.scss'],
})
export class AdminDashboardNotificationsPage implements OnInit {
    notifications: any;
    notification: Notification;
    users: Array<User>;
    title: any;
    body: any;
    title2: any;
    body2: any;
    target2: any;
    user: any;
    confirmButtonText: string;
    rejectButtonText: string;

    constructor(private notificationService: NotificationService, private userService: UserService,
                public toastController: ToastController) {

        this.userService.getUsers().subscribe(data => this.users = data);
        this.title2 = 'New message';
        this.body2 = 'You received a new message';
        this.target2 = 'menu/leaderboard/leaderboard/detail';
        this.confirmButtonText = 'Nice';
        this.rejectButtonText = 'Dismiss';
    }

    sendNotification() {
        this.notificationService.sendUserNotification(this.user, this.title2, this.body2, 'manual-notification', this.target2,
            this.confirmButtonText, this.rejectButtonText)
            .then(
                res => console.log(res),
                err => console.log(err)
            );
        this.title2 = '';
        this.body2 = '';
        this.user = '';
        this.target2 = '';
        this.confirmButtonText = '';
        this.rejectButtonText = '';

        this.presentToast();
    }

    async presentToast() {
        await this.toastController.create({
            color: 'dark',
            duration: 2000,
            message: 'Notification sent successfully!',
            buttons: [
                {
                    text: 'Done',
                    role: 'cancel'
                }
            ]
        }).then(toast => {
            toast.present();
        });
    }

    sendGoalNotification(title: any, body: any) {
        this.notificationService.sendGoalNotification(title, body).then(
            res => console.log(res),
            err => console.log(err)
        );

        this.title = '';
        this.body = '';


        this.presentToast();
    }

    ngOnInit() {
    }

}
