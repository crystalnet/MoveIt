import {Injectable} from '@angular/core';
import * as firebase from 'firebase/app';
import 'firebase/auth';
import {AngularFireDatabase} from '@angular/fire/database';
import {Activity} from '../../model/activity';
import {first, map, tap} from 'rxjs/operators';
import {PostService} from '../post/post.service';
import {Post} from '../../model/post';
import {GoalService} from '../goal/goal.service';
import {RewardsService} from '../rewards/rewards.service';
import {Health} from '@ionic-native/health/ngx';
import {Storage} from '@ionic/storage';

@Injectable({
    providedIn: 'root'
})
export class ActivityService {
    activityLocation = '/activities/';

    constructor(private fireDatabase: AngularFireDatabase, private postService: PostService, private goalService: GoalService,
                private rewardsService: RewardsService, private health: Health, private storage: Storage) {
    }

    writeActivitytoFirebase(activity: Activity) {
        activity.id = activity.startTime.getTime().toString();
        return this.fireDatabase.database.ref('/activities/' + firebase.auth().currentUser.uid + '/' + activity.id)
            .set(activity.toFirebaseObject());
    }

    /**
     * Creates a new activity in firebase from an activity object
     *
     * @param activity an existing activity object
     */
    createActivity(activity: Activity) {
        return new Promise<any>((resolve, reject) => {
            this.synchronizeApi(false).then(
                () => {
                    this.writeActivitytoFirebase(activity).then(
                        // Returns the activity with the new id
                        () => {
                            this.writeFitnessApi(activity);
                            const message = 'Look, I did ' + activity.getDuration() + ' minutes of ' + activity.type;
                            this.runUpdates(activity, true, message).then(
                                () => resolve(activity),
                                err => reject(err)
                            );
                        },
                        err => reject(err)
                    );
                },
                err => reject(err)
            );
        });
    }

    /**
     * Updates an activity in firebase
     *
     * @param activityId the id of the activity to be edited
     * @param activity the updated/new activity
     */
    editActivity(activityId, activity: Activity) {
        return new Promise<any>((resolve, reject) => {
            this.fireDatabase.database.ref(this.activityLocation + firebase.auth().currentUser.uid).child(activityId)
                .set(activity.toFirebaseObject()).then(
                () => {
                    // const message = 'I edited my activity, I did ' + activity.getDuration() + ' minutes of ' + activity.type;
                    this.runUpdates(activity, false).then(
                        () => resolve(activity),
                        err => reject(err)
                    );
                },
                err => reject(err)
            );
        });
    }

    runUpdates(activity?: Activity, sendPost: boolean = true, message?: string) {
        return new Promise<any>((resolve, reject) => {
            this.getAllUserActivities().pipe(first()).subscribe(activities => {
                this.goalService.getGoals().pipe(first()).subscribe(goals => {
                    console.log(activities);
                    const promises = [];
                    promises.push(this.goalService.updateGoals(goals, activities));
                    promises.push(this.rewardsService.updateTrophies(activities, goals));

                    if (activity && sendPost) {
                        const post = new Post();
                        post.activity = activity.id;
                        post.type = 'activity';
                        post.title = activity.getDuration() + ' min ' + activity.type;
                        if (message) {
                            post.content = message;
                        } else {
                            post.content = 'Look, I did ' + activity.getDuration() + ' minutes of ' + activity.type;
                        }
                        promises.push(this.postService.createPost(post));
                    }

                    Promise.all(promises).then(
                        () => resolve(),
                        err => reject(err));
                });
            });
        });
    }


    /**
     * Retrieves an activity from firebase
     *
     * @param activityId id of the activity
     */
    getActivity(activityId) {
        return new Promise<any>((resolve, reject) => {
            firebase.database().ref(this.activityLocation + firebase.auth().currentUser.uid).child(activityId).once('value').then(
                snapshot => {
                    const data = snapshot.val();
                    // Convert the data to an activity object and return it
                    resolve(Activity.fromFirebaseObject(activityId, data));
                },
                err => reject(err)
            );
        });
    }

    /**
     * Retrieve all activities of the current user
     */
    getAllUserActivities(limit = 5) {
        const ref = this.fireDatabase
            .list<Activity>(this.activityLocation + firebase.auth().currentUser.uid, query => query.orderByKey().limitToLast(limit));
        console.log('ACTIVITIES FUNCTION RUN');
        return ref.snapshotChanges().pipe(tap(x => console.log('ACTIVITIES SNAPSHOT CHANGED', x)), map(activities => activities.map(
            activitySnapshot => Activity.fromFirebaseObject(activitySnapshot.key, activitySnapshot.payload.val())).reverse()));
    }

    getThisUsersActivities(userId: string) {
        const ref = this.fireDatabase
            .list<Activity>(this.activityLocation + userId, query => query.orderByChild('endTime'));
        return ref.snapshotChanges().pipe(map(activities => activities.map(
            activitySnapshot => Activity.fromFirebaseObject(activitySnapshot.key, activitySnapshot.payload.val())).reverse()));
    }


    /**
     * Retrieve all activities for a specific start and end date from the FitnessAPI
     */
    readFitnessApi() {
        return new Promise<any>((resolve, reject) => {
            this.health.isAvailable()
                .then((available: boolean) => {
                    console.log('HEALTH IS AVAILABLE :' + available);
                    this.health.requestAuthorization([
                        /* 'distance', 'nutrition', //read and write permissions
                        {
                            read: ['steps'], //read only permission
                            write: ['height', 'weight'] //write only permission
                        } */
                        'activity', 'distance'
                    ]).then(res => {
                            console.log(res);
                            // permission successful
                            // get a the date when API is last time read
                            return this.storage.get('lastDate').then((lastDate: Date) => {
                                    console.log('last time read at: ', lastDate);
                                    let startDate: Date;

                                    if (lastDate != null) {
                                        startDate = new Date(new Date(lastDate).getTime() + 1); // last time read + 1 ms
                                    } else {
                                        // 14 days ago by default if data has not been read yet
                                        startDate = new Date(new Date().getTime() - 14 * 24 * 60 * 60 * 1000);
                                    }
                                    const endDate = new Date(); // now

                                    // read API
                                    return this.health.query({
                                        startDate,
                                        endDate,
                                        dataType: 'activity',
                                    }).then((value: []) => {
                                        console.log('Value of Health Data loaded: ', value);
                                        this.updateLastDate(endDate);
                                        resolve(Activity.fromFitApi(value));
                                    }).catch((e: any) => {
                                        console.log('HealthData ERROR:---' + e);
                                        reject(e);
                                    });
                                },
                                err => reject(err));
                        }
                    ).catch(e => console.log(e));
                })
                .catch(e => console.log(e));


        });
    }


    synchronizeApi(runUpdates = true) {
        return new Promise<any>((resolve, reject) => {
            this.readFitnessApi().then((activities: Activity[]) => {
                    const promises = [];
                    for (const activity of activities) {
                        promises.push(this.writeActivitytoFirebase(activity));
                    }
                    Promise.all(promises).then(
                        () => {
                            this.updateLastDate();
                            if (runUpdates) {
                                this.runUpdates().then(
                                    () => {
                                        resolve();
                                    },
                                    err => reject(err)
                                );
                            } else {
                                resolve();
                            }
                        },
                        err => reject(err)
                    );
                },
                err => reject(err));
        });
    }

    getLastDate() {
        return this.storage.get('lastDate');
    }

    updateLastDate(date: Date = new Date()) {
        return this.storage.set('lastDate', date);
    }


    /**
     * writes an activity to the FitnessAPI
     */
    writeFitnessApi(activity: Activity) {
        this.health.requestAuthorization([
            /* 'distance', 'nutrition', //read and write permissions
            {
                read: ['steps'], //read only permission
                write: ['height', 'weight'] //write only permission
            } */
            'activity', 'distance' // we only need read and write permission
        ])
            .then(
                res => {
                    console.log(res);
                    this.health.store({
                        startDate: activity.startTime,
                        endDate: activity.endTime,
                        dataType: 'activity',
                        value: activity.type,
                        sourceName: 'MoveIt',
                        sourceBundleId: 'com.moveitproject.www',
                    })
                        .then(res2 => console.log('Response of API while writing' + res2))
                        .catch(e => console.log('Response of API while writing ERROR:' + e));
                })
            .catch(e => console.log(e));
    }
}
