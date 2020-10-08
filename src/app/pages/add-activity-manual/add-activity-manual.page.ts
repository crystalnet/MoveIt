import {Component, OnInit} from '@angular/core';
import {Activity} from '../../model/activity';
import {ActivityService} from '../../services/activity/activity.service';
import {Location} from '@angular/common';
import {LoadingController, ToastController} from '@ionic/angular';
import {FormBuilder, FormGroup} from '@angular/forms';
import {NavigationExtras, Router} from '@angular/router';
import * as moment from 'moment';

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
    addForm: FormGroup;
    errorMessage = '';
    successMessage = '';
    todayA: Date = new Date();
    today: string = new Date().toISOString();
    date: string = new Date().toISOString();
    minDate: string = moment().startOf('day').subtract(2, 'day').toISOString(true);
    check = false;
    validationMessage: string;
    error = false;


    constructor(private activityService: ActivityService, private location: Location, public toastController: ToastController,
                private formBuilder: FormBuilder, private router: Router, private loadingController: LoadingController) {
        this.activity = new Activity();
        this.location = location;
        this.types = Activity.types;
        this.intensities = Activity.intensities;
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

    convertDate() {
        const date = this.date;
        const time = this.time;

        const t1: any = date.split('T');
        const t2: any = time.split('T');
        const t3: any = t1[0].concat('T', t2[1]);

        this.activity.startTime = new Date(t3);
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
        /*  const alert = await this.alertController.create({
            header: 'Success',
            message: 'Activity added successfully!',
            buttons: ['OK'],
          });

          await alert.present();
          let result = await alert.onDidDismiss();
          console.log(result);*/
    }

    async addActivity() {
        if (this.minutes <= 0) {
            return;
        }

        if (this.time == null || this.date == null || this.minutes == null) {
            this.error = true;
            return;
        }
        const date = this.date;
        const time = this.time;
        const t1: any = date.split('T');
        const t2: any = time.split('T');
        const t3: any = t1[0].concat('T', t2[1]);

        this.activity.startTime = new Date(t3);
        const newDateObj = new Date(this.activity.startTime.getTime() + this.minutes * 60000);

        this.activity.endTime = new Date(newDateObj);

        this.activity.source = 'moveItApp';

        console.log(this.activity);

        if ((this.todayA.getTime() - this.activity.startTime.getTime()) < 0) {
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
