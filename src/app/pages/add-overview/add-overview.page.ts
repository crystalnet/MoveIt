import {Component, OnInit} from '@angular/core';
import {Location} from '@angular/common';
import {ActivityService} from '../../services/activity/activity.service';
import {LoadingController, ToastController} from '@ionic/angular';

@Component({
    selector: 'app-add-overview',
    templateUrl: './add-overview.page.html',
    styleUrls: ['./add-overview.page.scss'],
})
export class AddOverviewPage implements OnInit {
    lastDate: Date;

    constructor(private location: Location, private activityService: ActivityService, private toastController: ToastController,
                private loadingController: LoadingController) {
        this.updateLastSynchronized();
    }

    updateLastSynchronized() {
        this.activityService.getLastDate().then(
            res => this.lastDate = res,
            err => console.log(err));
    }

    ngOnInit() {
        this.updateLastSynchronized();
    }

    goBack() {
        this.location.back();
    }

    async synchronizeActivities() {
        const loading = await this.loadingController.create({
            cssClass: 'my-custom-class',
            message: 'Synchronizing...',
            duration: 10000
        });
        await loading.present();

        console.log('Synchronizing activities');
        this.activityService.synchronizeApi().then(
            res => {
                console.log(res);
                loading.dismiss();
                this.presentAlert('Activities have been synchronized');
                this.updateLastSynchronized();
            },
            err => {
                console.log(err);
                loading.dismiss();
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

    async presentLoading() {

    }
}
