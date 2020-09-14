import {Component, OnInit} from '@angular/core';
import {Location} from '@angular/common';
import {ActivityService} from '../../services/activity/activity.service';
import {ToastController} from '@ionic/angular';

@Component({
    selector: 'app-add-overview',
    templateUrl: './add-overview.page.html',
    styleUrls: ['./add-overview.page.scss'],
})
export class AddOverviewPage implements OnInit {
    lastDate: Date;

    constructor(private location: Location, private activityService: ActivityService, private toastController: ToastController) {
        this.updateLastSynchronized();
    }

    updateLastSynchronized() {
        this.activityService.getLastDate().then(
            res => this.lastDate = res,
            err => console.log(err));
    }

    ngOnInit() {
    }

    goBack() {
        this.location.back();
    }

    synchronizeActivities() {
        console.log('Synchronizing activities');
        this.activityService.synchronizeApi().then(
            res => {
                console.log(res);
                this.presentAlert('Activities have been synchronized');
                this.updateLastSynchronized();
            },
            err => {
                console.log(err);
                this.presentAlert('Activities could not be fetched. See logs for more info.');
            }
        );
    }

    async presentAlert(text) {
        await this.toastController.create({
            color: 'dark',
            duration: 2000,
            message: text,
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
}
