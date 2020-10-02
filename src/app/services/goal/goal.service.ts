import {Injectable} from '@angular/core';
import {AngularFireDatabase} from '@angular/fire/database';
import {Goal} from '../../model/goal';
import * as firebase from 'firebase/app';
import 'firebase/auth';
import {Activity} from '../../model/activity';
import {GoalArray} from '../../model/goalArray';
import {map} from 'rxjs/operators';
import {PostService} from '../post/post.service';
import {Post} from '../../model/post';
import {TrackingService} from '../tracking/tracking.service';
import {ActionLog} from '../../model/actionLog';
import * as moment from 'moment';
import {Moment} from 'moment';

@Injectable({
    providedIn: 'root'
})
export class GoalService {

    constructor(private fireDatabase: AngularFireDatabase, private postService: PostService, private trackingService: TrackingService) {
    }

    /**
     * Create a new goal
     *
     * @param goal Goal object to use
     */
    createGoal(goal: Goal) {
        return new Promise<any>((resolve, reject) => {
            // Use the name as the key
            const promises = [];
            promises.push(this.fireDatabase.database.ref('/goals/' + firebase.auth().currentUser.uid + '/' + goal.name)
                .set(goal.toFirebaseObject()));
            promises.push(this.fireDatabase.database.ref('/goalHistory/' + firebase.auth().currentUser.uid + '/' + goal.name)
                .set({}));
        });
    }

    /**
     * Initialize user goals
     *
     * This creates a new goal for every default goal given in model/Goal.ts
     * All the default values there will be used.
     *
     */
    initializeUserGoals() {
        return new Promise<any>((resolve, reject) => {
            for (const goal of Goal.defaultGoals) {
                this.updateGoal(goal).then(
                    () => null,
                    err => reject(err)
                );
                this.fireDatabase.database.ref('/leaderboard/nWins/' + goal.name + '/' + firebase.auth().currentUser.uid).set(0);
                this.fireDatabase.database.ref('/goalHistory/' + firebase.auth().currentUser.uid + '/' + goal.name  ).set({a: 'b'});
            }
            resolve('Successfully initialized goals');
        });
    }

    /**
     * Retrieve a goal given its name
     *
     * @param name of the goal
     */
    getGoal(name: string) {
        return new Promise<any>((resolve, reject) => {
            this.fireDatabase.database.ref('/goals/' + firebase.auth().currentUser.uid + '/' + name).once('value').then(
                goal => resolve(Goal.fromFirebaseObject(name, goal.val())),
                err => reject(err)
            );
        });
    }

    /**
     * Update a goal if you've made changes to it
     *
     * The goal name is read from the goal parameter
     * @param goal new goal with changes values
     * @param activities to base the upadate on, if not present just the relative progress will be updated
     */
    updateGoal(goal: Goal, activities?: Array<Activity>) {
        if (activities) {
            goal.current = this.calculateGoalProgress(goal, activities);
        }
        goal.relative = goal.current / goal.target;
        return new Promise<any>((resolve, reject) => {
            const promises = [];
            promises.push(this.fireDatabase.database
                .ref('/goals/' + firebase.auth().currentUser.uid + '/' + goal.name).set(goal.toFirebaseObject()));
            promises.push(this.fireDatabase.database
                .ref('/leaderboard/relative/' + goal.name + '/' + firebase.auth().currentUser.uid).set(goal.relative));
            promises.push(this.fireDatabase.database
                .ref('/leaderboard/absolute/' + goal.name + '/' + firebase.auth().currentUser.uid).set(goal.current));
            Promise.all(promises).then(
                () => resolve(),
                err => reject(err)
            );
        });
    }

    /**
     * Adjust a goal by setting a new target
     *
     * @param goal the goal to be set to the new target value
     * @param target new target value
     */
    adjustGoal(goal: Goal, target: number) {
        return new Promise<any>((resolve, reject) => {
            // Log the goal adjustment
            this.trackingService.logAction(new ActionLog('goal-adjustment', goal.name, goal.target, target));
            // Set the new target value
            goal.target = target;

            this.updateGoal(goal).then(
                res => resolve(res),
                err => reject(err)
            );
        });
    }

    /**
     * Get all goals of the current user
     */
    getGoals() {
        return this.getGoalsFromUser(firebase.auth().currentUser.uid);
    }

    getGoalsFromUser(userId: string) {
        const ref = this.fireDatabase.list<Goal>('/goals/' + userId);
        // Retrieve an array, but with its metadata. This is necessary to have the key available
        // An array of Goals is reconstructed using the fromFirebaseObject method
        return ref.snapshotChanges().pipe(
            map(goals => goals.map(goalPayload => (Goal.fromFirebaseObject(goalPayload.key, goalPayload.payload.val())))));
    }

    getAllOtherAvailableGoals() {
        return this.fireDatabase.list<GoalArray>('/goals/').snapshotChanges().pipe(
            map(goals => goals.map(goalPayload => (GoalArray.fromFirebaseObject(goalPayload.key, goalPayload.payload.val())))));
    }

    getLeaderboardGoals(metric: string, goal: string) {
        console.log('path queried: ', '/leaderboard/' + metric + '/' + goal);
        return this.fireDatabase.object('/leaderboard/' + metric + '/' + goal).snapshotChanges().pipe(
            map(result => result.payload.val()));
    }

    getGoalHistory(userId: string = firebase.auth().currentUser.uid) {
        const ref = this.fireDatabase.object('/goalHistory/' + userId);
        // Retrieve an array, but with its metadata. This is necessary to have the key available
        // An array of Goals is reconstructed using the fromFirebaseObject method
        return ref.valueChanges();
    }

    /**
     * Get all goalsWins of the current user
     */
    getGoalWinsName() {
        // return this.fireDatabase.list<number>('/wins/' + firebase.auth().currentUser.uid).valueChanges();

        const ref = this.fireDatabase.list<number>('/wins/' + firebase.auth().currentUser.uid);
        // Retrieve an array, but with its metadata. This is necessary to have the key available
        // An array of Goals is reconstructed using the fromFirebaseObject method
        return ref.snapshotChanges().pipe(
            map(goals => goals.map(goalPayload => (goalPayload.key))));
    }

    getGoalWins() {
        //   return ref.snapshotChanges().pipe(
        //     map(goals => goals.map(goalPayload => (Goal.fromFirebaseObject(goalPayload.key, goalPayload.payload.val())))));


        return this.fireDatabase.list<number>('/wins/' + firebase.auth().currentUser.uid).valueChanges();
        //  return ref.snapshotChanges().pipe(
        //    map(wonGoals => wonGoals.map(wonPayload => (Date(wonPayload.key, wonPayload.payload.val()))));

    }

    /**
     * Update all goals and set the new progress
     *
     * Recalculates the active minutes for each goal and updates the goals by setting the new progress value
     * @param goals list of goals to be updated
     * @param activities list of activities to measure the goals on
     */
    updateGoals(goals: Array<Goal>, activities: Array<Activity>) {
        return new Promise<any>((resolve, reject) => {
            for (const goal of goals) {
                this.updateGoal(goal, activities).then(
                    res => console.log(res),
                    err => reject(err)
                );

                if (goal.current >= goal.target) {
                    this.winGoal(goal).then(
                        res => console.log(res),
                        err => reject(err)
                    );
                }
            }
            resolve('Successfully updated goals');
        });
    }

    /**
     * Calculate the progress of a given goal
     *
     * @param goal to calculate the progress for
     * @param activities list of activities to base the progress on
     * @param referenceDate the date from which to count back. If this is not specified we assume that for example for a weekly goal, we
     *                      calculate the progress from start of the week until now. If the referenceDate is one week earlier, we count back
     *                      one week from that point in time.
     */
    calculateGoalProgress(goal: Goal, activities: Array<Activity>, referenceDate?: Moment) {
        const endDate = referenceDate ? referenceDate : moment();
        // @ts-ignore
        const startDate = endDate.clone().startOf(goal.duration.slice(0, -2));

        // Filter the activities based on the goals type (e.g. 'moderate') and duration (e.g. 'weekly')
        let times;
        if (goal.type !== 'active') {
            const filteredActivities = this.filterActivities(activities, startDate, endDate, goal.type);
            // Get the duration for each activity
            times = filteredActivities.map((activity) => activity.getDuration());
        } else {
            const filteredActivities = this.filterActivities(activities, startDate, endDate);
            // Get the duration for each activity
            times = filteredActivities.map((activity) => {
                if (activity.intensity === 'vigorous') {
                    return 2 * activity.getDuration();
                } else {
                    return activity.getDuration();
                }
            });
        }
        console.log(goal);
        console.log(times);

        // Check if there are elements in the array, that passed the filtering
        if (times.length > 0) {
            // Return the sum of the durations.
            return times.reduce((accumulator, currentValue) => accumulator + currentValue);
        } else {
            return 0;
        }
    }

    getStartOf(week = false) {
        let startDate = new Date();
        startDate.setHours(0, 0, 0, 0); // Set to start of the day (= 0:00:00)
        if (week) {
            // If it's a weekly goal, set to start of the week (week starts on Sunday)
            const startOfWeek = startDate.getDate() - startDate.getDay();
            startDate = new Date(startDate.setDate(startOfWeek));
        }
        return startDate;
    }

    /**
     * Win a goal and add current time to the list of wins
     *
     * @param goal to be won
     */
    winGoal(goal: Goal) {
        return new Promise<any>((resolve, reject) => {
            // Get the current list of wins
            this.fireDatabase.database.ref('/wins/' + firebase.auth().currentUser.uid + '/' + goal.name)
                .once('value').then(
                (winsSnapshot) => {
                    let wins = winsSnapshot.val();
                    let createPost = true;
                    if (Array.isArray(wins)) {
                        // If the list exists, check if the goal was already won today
                        const lastWin = moment(wins.slice(-1)[0]);
                        const now = moment();
                        if (goal.duration === 'weekly' && lastWin.isSame(now, 'week')) {
                            resolve(goal.name + ' goal was already won');
                            createPost = false;
                        } else if (goal.duration === 'daily' && lastWin.isSame(now, 'day')) {
                            resolve(goal.name + ' goal was already won');
                            createPost = false;
                        } else {
                            // If not, append it to the wins list
                            wins.push((new Date()).getTime());
                        }
                    } else {
                        // If it doesn't exist, create a new array with the current win
                        wins = [(new Date()).getTime()];
                    }
                    this.fireDatabase.database.ref('/leaderboard/' + '/nWins/' + goal.name + '/' + firebase.auth().currentUser.uid)
                        .set(wins.length).catch(err => console.log(err));
                    this.trackingService.logAction(new ActionLog('goal-won', goal.name, goal.target, goal.target));
                    if (createPost) {
                        this.fireDatabase.database.ref('/wins/' + firebase.auth().currentUser.uid + '/' + goal.name)
                            .set(wins).then(
                            (res) => {
                                const post = new Post();
                                post.title = goal.duration + ' ' + goal.type + ' goal achieved';
                                post.content = 'Hooray, I\'ve achieved my ' + goal.duration + ' goal for ' + goal.type;
                                post.type = 'goalAchievement';
                                this.postService.createPost(post).then(
                                    () => resolve(res),
                                    err => reject(err)
                                );
                            },
                            (err) => reject(err));
                    }
                },
                (err) => reject(err));
        });
    }

    /**
     * Filter an array of activities based on time and intensity
     *
     * The output is an array of activities, where all items match the given intensity and their endTime lies between
     * the fromDate and the untilDate
     *
     * @param activities array of activities
     * @param intensity intensity to filter for (e.g. 'moderate')
     * @param fromDate earliest endTime of an activity
     * @param untilDate latest endTime of an activity
     */
    filterActivities(activities: Array<Activity>, fromDate: Moment = moment(), untilDate: Moment = moment(), intensity?: string) {
        return activities.filter((activity: Activity) => {
            if (intensity && activity.intensity !== intensity) {
                return false;
            }
            const time = moment(activity.endTime);
            if (time.isBefore(fromDate, 'day')) {
                return false;
            }

            if (time.isAfter(untilDate, 'day')) {
                return false;
            }

            return true;
        });
    }
}
