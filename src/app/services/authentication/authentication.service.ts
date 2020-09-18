import {Injectable} from '@angular/core';
import * as firebase from 'firebase/app';
import 'firebase/auth';
import {AngularFireDatabase} from '@angular/fire/database';
import {User} from '../../model/user';
import {GoalService} from '../goal/goal.service';
import {RewardsService} from '../rewards/rewards.service';


@Injectable()
export class AuthenticateService {
    private user: User;

    constructor(private db: AngularFireDatabase, private goalService: GoalService, private rewardsService: RewardsService) {
    }

    /**
     * registerUser
     *
     * creates a new user in the firebase authentication service and the database
     *
     * @param otp one-time-password for account creation
     * @param email of the user
     * @param password of the user
     * @param user Object containing things like name, gender, etc.
     */
    registerUser(otp: string, email: string, password: string, user: User) {
        return new Promise<any>((resolve, reject) => {
            this.validateOTP(otp).then(
                group => {
                    firebase.auth().createUserWithEmailAndPassword(email, password)
                        .then(
                            // If the auth service could create the new user, we'll enter this function
                            (userCredential) => {
                                user.id = userCredential.user.uid;
                                user.group = group;
                                user.profilePictureUrl = 'https://firebasestorage.googleapis.com/v0/b/moveit-2019.appspot.com/o/profilePic%2FdefaultPic?alt=media&token=77281e2a-9855-4b8a-b8dc-74ee60092cc4';
                                const promises = [];
                                promises.push(this.removeOTP(otp));
                                // Try to create the user on the database
                                promises.push(this.db.database.ref('/challengesStatus/' + user.id + '/won/default').set('default'));
                                promises.push(this.registerOnDatabase(user));
                                promises.push(this.goalService.initializeUserGoals());
                                promises.push(this.rewardsService.initializeTrophies());
                                promises.push(this.addUserTimesToSchedule(user));
                                Promise.all(promises).then(
                                    () => resolve(),
                                    err => reject(err)
                                );
                            },
                            err => reject(err)
                        );
                });
        });
    }

    validateOTP(otp: string) {
        return new Promise<any>((resolve, reject) => {
            this.db.database.ref('/otps/' + otp).once('value').then(
                groupSnapshot => {
                    // Maybe use snapshot.exists() ?
                    const group = groupSnapshot.val();
                    if (group) {
                        resolve(group);
                    } else {
                        reject('invalid otp');
                    }
                },
                err => reject(err)
            );
        });
    }

    removeOTP(otp: string) {
        return this.db.database.ref('/otps/' + otp).remove();
    }

    registerOnDatabase(user: User) {
        return this.db.object<any>('/users/' + user.id).set(user.toFirebaseObject());
    }

    addUserTimesToSchedule(user: User) {
        for (const t of user.times) {
            const time = new Date(t);
            this.db.database.ref('/times/' + time.getHours() + '/' + time.getMinutes()).push(user.id);
        }
    }

    loginUser(value) {
        return new Promise<any>((resolve, reject) => {
            firebase.auth().signInWithEmailAndPassword(value.email, value.password)
                .then(
                    res => resolve(res),
                    err => reject(err));
        });
    }

    logoutUser() {
        return new Promise((resolve, reject) => {
            if (firebase.auth().currentUser) {
                firebase.auth().signOut()
                    .then(() => {
                        this.user = null;
                        console.log('LOG Out');
                        resolve();
                    }).catch((error) => {
                    reject(error);
                });
            }
        });
    }
}
