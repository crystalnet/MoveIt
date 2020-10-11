import {Injectable} from '@angular/core';
import {AngularFireDatabase} from '@angular/fire/database';
import {Goal} from '../../model/goal';
import * as firebase from 'firebase/app';
import 'firebase/auth';
import {Activity} from '../../model/activity';
import {GoalArray} from '../../model/goalArray';
import {first, map} from 'rxjs/operators';
import {PostService} from '../post/post.service';
import {Post} from '../../model/post';
import {TrackingService} from '../tracking/tracking.service';
import {ActionLog} from '../../model/actionLog';
import * as moment from 'moment-timezone';
import {Moment} from 'moment-timezone';
import {forkJoin} from 'rxjs';

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
            this.fireDatabase.database.ref('/leaderboard/nWins/' + firebase.auth().currentUser.uid).set(0);
            for (const goal of Goal.defaultGoals) {
                this.updateGoal(goal).then(
                    () => null,
                    err => reject(err)
                );
                this.fireDatabase.database.ref('/goalHistory/' + firebase.auth().currentUser.uid + '/' + goal.name).set({a: 'b'});
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
            if (goal.relative >= 1) {
                promises.push(this.winGoal(goal));
            }
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

    getGoalHistoryTimeframe(startAt, endAt, userId: string = firebase.auth().currentUser.uid) {
        const ref = this.fireDatabase
            .list<any>(
                'goalHistory/' + userId,
                query => query.orderByKey().startAt(startAt.toString()).endAt(endAt.toString()));
        return ref.snapshotChanges().pipe(map(
            historyEntries => historyEntries.reduce((a, entry) => Object.assign(a, {[entry.key]: entry.payload.val()}), {})));
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
     * @param startDate for activities
     * @param endDate for activities
     * @param activities list of activities to measure the goals on
     */
    updateGoals(startDate: Moment, endDate: Moment, activities: Array<Activity>) {
        return new Promise<any>((resolve, reject) => {
            startDate.subtract(1, 'day');
            const observables = [];
            observables.push(this.getGoalHistoryTimeframe(startDate.endOf('day').valueOf(), endDate.endOf('day').valueOf()).pipe(first()));
            if (endDate.isSameOrAfter(moment().tz('Europe/Berlin'))) {
                observables.push(this.getGoals().pipe(first()));
            }

            forkJoin(observables).subscribe((result: [any[], Goal[]?]) => {
                console.log(result);
                const goalHistory = result[0];
                const progress = {};
                // for (const defaultGoal of Goal.defaultGoals) {
                //     progress[defaultGoal.name] = {};
                // }

                for (const activity of activities) {
                    const time = moment(activity.startTime).tz('Europe/Berlin');
                    const intensityGoals = [`daily-${activity.intensity}`, `weekly-${activity.intensity}`];
                    const activeGoals = ['daily-active', 'weekly-active'];
                    if (time.isSameOrAfter(startDate, 'day') && time.isSameOrBefore(endDate, 'day')) {
                        const key = time.endOf('day').valueOf();
                        if (!(key in progress)) {
                            progress[key] = {};
                            for (const defaultGoal of Goal.defaultGoals) {
                                progress[key][defaultGoal.name] = 0;
                            }
                        }
                        for (const goalName of intensityGoals) {
                            progress[key][goalName] += activity.getDuration();
                        }
                        for (const goalName of activeGoals) {
                            const value = activity.intensity === 'vigorous' ? 2 * activity.getDuration() : activity.getDuration();
                            progress[key][goalName] += value;
                        }
                    }
                }

                let lastKey = startDate.endOf('day').valueOf().toString();
                if (!(lastKey in goalHistory)) {
                    goalHistory[lastKey] = {};
                    for (const defaultGoal of Goal.defaultGoals) {
                        goalHistory[lastKey][defaultGoal.name] = defaultGoal.toFirebaseObject();
                    }
                }
                startDate.add(1, 'day');
                while (startDate.isSameOrBefore(endDate)) {
                    const key = startDate.endOf('day').valueOf().toString();

                    if (!(key in goalHistory)) {
                        goalHistory[key] = {};
                        for (const defaultGoal of Goal.defaultGoals) {
                            goalHistory[key][defaultGoal.name] = defaultGoal.toFirebaseObject();
                            if (lastKey && lastKey in goalHistory) {
                                goalHistory[key][defaultGoal.name].target = goalHistory[lastKey][defaultGoal.name].target;
                            }
                        }
                    }

                    if (!(key in progress)) {
                        for (const defaultGoal of Goal.defaultGoals) {
                            goalHistory[key][defaultGoal.name].current = 0;
                            goalHistory[key][defaultGoal.name].relative = 0;

                            if (defaultGoal.duration === 'weekly' && startDate.get('day') !== 1 && lastKey && lastKey in goalHistory) {
                                const current = goalHistory[key][defaultGoal.name];
                                current.current = goalHistory[lastKey][defaultGoal.name].current;
                                current.relative = current.current / current.target;
                            }
                        }
                    } else {
                        for (const defaultGoal of Goal.defaultGoals) {
                            if (defaultGoal.duration === 'weekly' && startDate.get('day') !== 1 && lastKey in goalHistory) {
                                const current = goalHistory[key][defaultGoal.name];
                                current.current = progress[key][defaultGoal.name] + goalHistory[lastKey][defaultGoal.name].current;
                                current.relative = current.current / current.target;
                            } else {
                                const current = goalHistory[key][defaultGoal.name];
                                current.current = progress[key][defaultGoal.name];
                                current.relative = current.current / current.target;
                            }
                            if (goalHistory[key][defaultGoal.name].relative >= 1) {
                                const goal = Goal.fromFirebaseObject(defaultGoal.name, goalHistory[key][defaultGoal.name]);
                                // this.winGoal(goal, startDate, false);
                            }
                        }
                    }
                    this.fireDatabase.database.ref('goalHistory/' + firebase.auth().currentUser.uid + '/' + key).set(goalHistory[key]);

                    if (startDate.isSame(moment().tz('Europe/Berlin'), 'day')) {
                        const goals = result[1];
                        for (const goal of goals) {
                            goal.current = goalHistory[key][goal.name].current;
                            goal.relative = goal.current / goal.target;
                            this.updateGoal(goal);
                        }
                    }
                    lastKey = key.toString();
                    startDate.add(1, 'day');
                }
                resolve('Successfully updated goals');
            });
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
        const endDate = referenceDate ? referenceDate : moment().tz('Europe/Berlin');
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

    /**
     * Win a goal and add current time to the list of wins
     *
     * @param goal to be won
     * @param time reference time point
     * @param createPost whether to create a post
     */
    winGoal(goal: Goal, time: Moment = moment().tz('Europe/Berlin'), createPost = true) {
        return new Promise<any>((resolve, reject) => {
            // Get the current list of wins
            this.fireDatabase.database.ref('/wins/' + firebase.auth().currentUser.uid + '/' + goal.name)
                .once('value').then(
                (winsSnapshot) => {
                    let wins = winsSnapshot.val();
                    time.startOf('day');
                    if (Array.isArray(wins)) {
                        // If the list exists, check if the goal was already won today
                        const unit = goal.duration === 'weekly' ? 'week' : 'day';
                        const lastWin = wins.filter(win => moment(win).tz('Europe/Berlin').isSame(time, unit));
                        if (lastWin.length > 0) {
                            resolve(goal.name + ' goal was already won');
                            createPost = false;
                            return;
                        } else {
                            // If not, append it to the wins list
                            wins.push(time.valueOf());
                        }
                    } else {
                        // If it doesn't exist, create a new array with the current win
                        wins = [time.valueOf()];
                    }
                    this.trackingService.logAction(new ActionLog('goal-won', goal.name, goal.target, goal.target));
                    this.fireDatabase.database.ref('/wins/' + firebase.auth().currentUser.uid + '/' + goal.name)
                        .set(wins).then(
                        (res) => {
                            if (createPost) {
                                const post = new Post();
                                post.title = goal.duration.charAt(0).toUpperCase() + goal.duration.slice(1) + ' goal achieved';
                                post.content = 'Hooray, I\'ve achieved my ' + goal.duration + ' goal of ' + goal.target + ' minutes';
                                post.type = 'goal-won';
                                this.postService.createPost(post).then(
                                    () => resolve(res),
                                    err => reject(err)
                                );
                            } else {
                                resolve(res);
                            }
                        },
                        (err) => reject(err));
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
    filterActivities(activities: Array<Activity>, fromDate: Moment = moment().tz('Europe/Berlin'), untilDate: Moment = moment().tz('Europe/Berlin'), intensity?: string) {
        return activities.filter((activity: Activity) => {
            if (intensity && activity.intensity !== intensity) {
                return false;
            }
            const time = moment(activity.endTime).tz('Europe/Berlin');
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
