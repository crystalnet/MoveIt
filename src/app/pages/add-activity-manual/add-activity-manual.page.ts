import {Component, OnInit} from '@angular/core';
import {Activity} from '../../model/activity';
import {ActivityService} from '../../services/activity/activity.service';
import {Location} from '@angular/common';
import {LoadingController, ToastController} from '@ionic/angular';
import {FormBuilder, FormGroup} from '@angular/forms';
import {NavigationExtras, Router} from '@angular/router';
import * as moment from 'moment';
import {Moment} from 'moment';

@Component({
    selector: 'app-add-activity-manual',
    templateUrl: './add-activity-manual.page.html',
    styleUrls: ['./add-activity-manual.page.scss'],
})
export class AddActivityManualPage implements OnInit {
    activity: Activity;
    minutes: number;
    time: string;
    types: Array<string>;
    intensities: Array<string>;
    errorMessage = '';
    successMessage = '';
    date: string = new Date().toISOString();
    today: Moment = moment();
    minDate: Moment = moment().startOf('day').subtract(2, 'day');
    check = false;
    error = false;


    constructor(private activityService: ActivityService, private location: Location, public toastController: ToastController,
                private formBuilder: FormBuilder, private router: Router, private loadingController: LoadingController) {
        this.activity = new Activity();
        this.location = location;
        this.types = Activity.types;
        this.intensities = Activity.intensities;
        console.log('ACTIVITIES');
    }

    goBack() {
        this.location.back();
    }

    ngOnInit() {
    }

    checkInput() {
        this.check = true;
    }

    routeToInfoSingle() {
        const navigationExtras: NavigationExtras = {
            queryParams: {
                infoId: 0
            }
        };
        this.router.navigate(['/menu/information'], navigationExtras);
    }

    async presentAlert() {
        await this.toastController.create({
            color: 'dark',
            duration: 2000,
            message: 'Activity added successfully!',
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

    async addActivity() {
        if (this.minutes <= 0) {
            return;
        }

        if (this.time == null || this.date == null || this.minutes == null) {
            this.error = true;
            return;
        }

        const t1: any = moment(this.date);
        const t2: any = moment(this.time);
        t1.set('hours', t2.get('hours')).set('minutes', t2.get('minutes'));

        this.activity.startTime = t2.toDate();

        t2.add(this.minutes, 'minutes');
        this.activity.endTime = t2.toDate();

        this.activity.source = 'moveItApp';
        console.log(this.activity);

        if ((new Date().getTime() - this.activity.startTime.getTime()) < 0) {
            this.error = true;
            return;
        }

        const loading = await this.loadingController.create({
            cssClass: 'my-custom-class',
            message: 'Adding activity...'
        });
        await loading.present();

        this.activityService.createActivity(this.activity).then(
            (activity) => {
                console.log(activity);
                this.activity = new Activity();
                this.time = '';
                this.date = new Date().toISOString();
                this.minutes = null;
                this.presentAlert();
                loading.dismiss();
                this.router.navigateByUrl('/menu/progress');
            })
            .catch(err => {
                loading.dismiss();
                console.error(err);
                }
            );
    }
}
