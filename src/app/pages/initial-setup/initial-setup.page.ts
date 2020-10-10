import {Component, OnInit} from '@angular/core';
import {combineLatest, Observable} from 'rxjs';
import {Location} from '@angular/common';
import {Router} from '@angular/router';
import {GoalService} from '../../services/goal/goal.service';
import {AlertController} from '@ionic/angular';
import {TrackingService} from '../../services/tracking/tracking.service';
import {UserService} from '../../services/user/user.service';
import {User} from '../../model/user';
import {Goal} from '../../model/goal';
import {AngularFireStorage, AngularFireUploadTask} from '@angular/fire/storage';
import {MyData} from '../profile-detail/profile-detail.page';
import * as firebase from 'firebase';
import {finalize, tap} from 'rxjs/operators';

@Component({
    selector: 'app-initial-setup',
    templateUrl: './initial-setup.page.html',
    styleUrls: ['./initial-setup.page.scss'],
})
export class InitialSetupPage implements OnInit {
    goalPromise: Observable<any>;
    userObservable: Observable<User>;
    user: User;
    dailyActive: Goal;
    weeklyActive: Goal;

    // Upload Task
    task: AngularFireUploadTask;
    // Progress in percentage
    percentage: Observable<number>;
    // Snapshot of uploading file
    snapshot: Observable<any>;
    // Uploaded File URL
    UploadedFileURL: Observable<string>;
    // Uploaded Image List
    images: Observable<MyData[]>;
    // File details
    fileName: string;
    fileSize: number;
    // Status check
    isUploading: boolean;
    isUploaded: boolean;

    constructor(private location: Location, private router: Router, private goalService: GoalService, private userService: UserService,
                private alertController: AlertController, private trackingService: TrackingService, private storage: AngularFireStorage) {
        const dailyActive = this.goalService.getGoal('daily-active');
        const weeklyActive = this.goalService.getGoal('weekly-active');
        this.userObservable = this.userService.getUser();
        this.userObservable.subscribe(user => this.user = user);
        this.goalPromise = combineLatest([dailyActive, weeklyActive]);
        this.goalPromise.subscribe(res => {
            this.dailyActive = res[0];
            this.weeklyActive = res[1];
        });
    }

    ngOnInit() {
    }

    goBack() {
        this.location.back();
    }

    save() {
        const promises = [];

        promises.push(this.goalService.adjustGoal(this.dailyActive, this.dailyActive.target));
        promises.push(this.goalService.adjustGoal(this.weeklyActive, this.weeklyActive.target));
        promises.push(this.userService.updateBio(this.user.bio));


        Promise.all(promises).then(
            res => {
                console.log(res);
                this.presentAlert();
                this.router.navigateByUrl('/menu/dashboard');
            },
            err => console.log(err)
        );
    }

    async presentAlert() {
        const alert = await this.alertController.create({
            header: 'You\'re all set!',
            message: 'You\'re account has been set up successfully. You\'re now ready to start using the app',
            buttons: [
                {
                    text: 'Let\'s go', handler: () => {
                        this.trackingService.logInAppNotification('account-setup-initial', '');
                    }
                }
            ],
        });
        await alert.present();
        const result = await alert.onDidDismiss();
        console.log(result);
    }

    calculateAge(birthday: Date) {
        const timeDiff = Math.abs(Date.now() - birthday.getTime());
        return Math.floor((timeDiff / (1000 * 3600 * 24)) / 365.25);

    }

    uploadFile(event: FileList) {
        // The File object
        const file = event.item(0);

        // Validation for Images Only
        if (file.type.split('/')[0] !== 'image') {
            console.error('unsupported file type :( ');
            return;
        }

        this.isUploading = true;
        this.isUploaded = false;

        this.fileName = file.name;

        // The storage path
        const path = `profilePic/${firebase.auth().currentUser.uid}/${file.name.slice(-10)}`;


        // File reference
        const fileRef = this.storage.ref(path);
        console.log(path);
        console.log(file);

        // The main task
        this.task = this.storage.upload(path, file);

        // Get file progress percentage
        this.percentage = this.task.percentageChanges();
        this.snapshot = this.task.snapshotChanges().pipe(
            finalize(() => {
                // Get uploaded file storage path
                this.UploadedFileURL = fileRef.getDownloadURL();

                this.UploadedFileURL.subscribe(resp => {
                    this.userService.changeProfilePicture(
                        firebase.auth().currentUser.uid,
                        resp
                    );
                    this.isUploading = false;
                    this.isUploaded = true;
                }, error => {
                    console.error(error);
                });
            }),
            tap(snap => {
                this.fileSize = snap.totalBytes;
            })
        );
    }
}
