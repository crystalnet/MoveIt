import {Component, OnInit} from '@angular/core';
import {Location} from '@angular/common';


import {combineLatest, Observable} from 'rxjs';

import {GoalService} from '../../services/goal/goal.service';

import {TrophyService} from '../../services/trophies/trophy.service';

import {LeaderboardObject} from '../../model/leaderboardObject';

import {GoalArray} from '../../model/goalArray';

import {User} from '../../model/user';

import {TrophyArray} from 'src/app/model/trophyArray';

import {ChallengesArray} from 'src/app/model/challengesArray';

import {ChallengeService} from '../../services/challenges/challenge.service';

import {UserService} from '../../services/user/user.service';

import {NavigationExtras, Router} from '@angular/router';


@Component({
    selector: 'app-leaderboard-detail',
    templateUrl: './leaderboard-detail.page.html',
    styleUrls: ['./leaderboard-detail.page.scss'],
})
export class LeaderboardDetailPage implements OnInit {
    persons: any;
    ranking = 'actMinutes';

    rewards = false;
    group: Observable<string>;
    config: Observable<string>;

    trophies: any;
    activitiesModerate: Array<LeaderboardObject>;
    activitiesObserve: Observable<GoalArray[]>;

    trophiesList: Array<LeaderboardObject>;
    trophiesObserve: Observable<TrophyArray[]>;

    challengeList: Array<LeaderboardObject>;
    challengesObserve: Observable<ChallengesArray[]>;

    goalWinsList: Array<LeaderboardObject>;
    goalProgressList: Array<LeaderboardObject>;

    tempUsername: string;

    currentUser: User;
    userObservable: Observable<any>;

    constructor(private router: Router, private challService: ChallengeService, private goalService: GoalService,
                private trophyService: TrophyService, private userService: UserService, private location: Location) {
    }

    /**
     * first get all important observables with the corresponding database queries
     */
    ngOnInit() {
        // set chart active if rewards group is assigned to group
        this.group = this.userService.getUsergroup();
        this.group.subscribe(group => this.updateGroup(group));

        this.userObservable = this.userService.getUser();
        this.userObservable.subscribe(user => this.currentUser = user);

        // Observable1
        this.activitiesObserve = this.goalService.getAllOtherAvailableGoals();

        // Observable1 in action
        this.activitiesObserve.subscribe(result => {
            this.pushMinuteObjects(result);
        });

        if (this.rewards) {
            // Observable2
            this.trophiesObserve = this.trophyService.getListOfAllUserAndTherWonTrophies();
            this.trophiesObserve.subscribe(result2 => {
                this.pushTrophyObjects(result2);
            });

            this.challengesObserve = this.challService.getListOfAllUserAndTheirWonChallenges();
            this.challengesObserve.subscribe(result3 => {
                this.pushChallengeObjects(result3);
            });
        }

        this.generateGoalWinsList();
        this.generateGoalProgressList();
    }

    viewProfile(counter, list) {
        const navigationExtras: NavigationExtras = {
            queryParams: {
                special: JSON.stringify(list[counter].id)
            }
        };
        this.router.navigate(['/menu/profile/profile/view'], navigationExtras);
    }

    updateGroup(group) {
        this.config = this.userService.getGroupconfig(group);
        this.config.subscribe(config => this.setPages(config));
    }

    setPages(config) {
        const array = JSON.parse(config);
        if (array.indexOf('Rewards') > -1) {
            this.rewards = true;
        }
    }

    /**
     * This method pushes the result of a query into the respective instances in order to make them visible on the UI
     * @param result the param from the database query which gets the array of all trophies won per user
     */
    async pushTrophyObjects(result) {
        const testArray = new Array<LeaderboardObject>();

        for (const element of result) {
            if (element) {
                const entity1 = await new LeaderboardObject(element.id, element.won.length, this.userService);
                console.log(entity1);
                testArray.push(entity1);
            }
        }
        this.trophiesList = this.sortArrays(testArray);
    }

    /**
     * This method pushes the result of a query into the respective instances in order to make them visible on the UI
     * @param result the param from the database query which gets the array of all trophies won per user
     */
    async pushChallengeObjects(result) {
        const testArray = new Array<LeaderboardObject>();

        for (const element of result) {
            if (element) {
                const entity1 = await new LeaderboardObject(element.id, element.won.length - 1, this.userService);
                console.log(entity1);
                testArray.push(entity1);
            }
        }

        this.challengeList = this.sortArrays(testArray);
    }

    /**
     * This method pushes the result of a query into the respective instances in order to make them visible on the UI
     * @param result the param from the database query which gets the array of all goalsprogress per user
     */
    pushMinuteObjects(result) {
        const testArray = new Array<LeaderboardObject>();

        for (const element of result) {
            if (element) {
                if (element.type === 'weekly') {
                    const entity1 = new LeaderboardObject(element.id, element.activity, this.userService);
                    testArray.push(entity1);
                }
            }
        }
        this.activitiesModerate = this.sortArrays(testArray);
    }

    generateGoalProgressList() {
        const moderateObservable = this.goalService.getLeaderboardGoals('weeklyModerate', 'relative');
        const vigorousObservable = this.goalService.getLeaderboardGoals('weeklyVigorous', 'relative');

        combineLatest(moderateObservable, vigorousObservable)
            .subscribe(result => {
                const moderateList = result[0];
                const vigorousList = result[1];
                const combinedList = moderateList;

                if (vigorousList && moderateList) {
                    for (const user of Object.keys(vigorousList)) {
                        if (user in Object.keys(combinedList)) {
                            combinedList[user] += vigorousList[user];
                        }
                        combinedList[user] = vigorousList[user];
                    }

                    const testarray = Object.keys(combinedList)
                        .map(uid => new LeaderboardObject(uid, combinedList[uid] > 0 ? combinedList[uid] / 2 : 0, this.userService));
                    this.goalProgressList = this.sortArrays(testarray);
                    console.log(this.goalProgressList);
                }
            });
    }

    generateGoalWinsList() {
        const moderateObservable = this.goalService.getLeaderboardGoals('dailyModerate', 'nWins');
        const vigorousObservable = this.goalService.getLeaderboardGoals('dailyVigorous', 'nWins');

        combineLatest(moderateObservable, vigorousObservable)
            .subscribe(result => {
                const moderateList = result[0];
                const vigorousList = result[1];
                const combinedList = moderateList;

                if (vigorousList && moderateList) {
                    for (const user of Object.keys(vigorousList)) {
                        if (user in Object.keys(combinedList)) {
                            combinedList[user] += vigorousList[user];
                        }
                        combinedList[user] = vigorousList[user];
                    }

                    const testarray = Object.keys(combinedList)
                        .map(uid => new LeaderboardObject(uid, combinedList[uid], this.userService));
                    this.goalWinsList = this.sortArrays(testarray);
                    console.log(this.goalWinsList);
                }
            });
    }

    /**
     * this method sorts all arrays for the leaderboard visualization
     */
    sortArrays(array) {
        if (array !== undefined) {
            array.sort((a, b) => a.compareTo(b));
        }
        return array;
    }

    calculateAge(birthday: Date) {
        const bday = new Date(birthday);
        const timeDiff = Math.abs(Date.now() - bday.getTime());
        return Math.floor((timeDiff / (1000 * 3600 * 24)) / 365.25);
    }

    goBack() {
        this.location.back();
    }
}
