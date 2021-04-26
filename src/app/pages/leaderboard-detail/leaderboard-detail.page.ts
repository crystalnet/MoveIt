import {Component, OnInit} from '@angular/core';
import {Location} from '@angular/common';


import {Observable} from 'rxjs';

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
import * as firebase from 'firebase';


@Component({
    selector: 'app-leaderboard-detail',
    templateUrl: './leaderboard-detail.page.html',
    styleUrls: ['./leaderboard-detail.page.scss'],
})
export class LeaderboardDetailPage implements OnInit {
    persons: any;
    ranking = 'activeMinutes';

    rewards = false;
    group: Observable<string>;
    config: Observable<string>;

    age: Observable<any>;
    userAge: any;
    gender: Observable<any>;
    userGender: any;
    userLeaderboardValueObserve: Observable<any>;
    userLeaderboardValue: any;
    valueDif: any;
    valueDif2: any;
    trophies: any;
    activitiesModerate: Array<LeaderboardObject>;
    activitiesModerateOne: Array<LeaderboardObject>;
    activitiesModerateTwo: Array<LeaderboardObject>;
    activitiesModerateThree: Array<LeaderboardObject>;
    activitiesModerateFour: Array<LeaderboardObject>;
    activitiesObserve: Observable<GoalArray[]>;

    trophiesList: Array<LeaderboardObject>;
    trophiesObserve: Observable<TrophyArray[]>;

    challengeList: Array<LeaderboardObject>;
    challengesObserve: Observable<ChallengesArray[]>;

    goalWinsList: Array<LeaderboardObject>;
    goalProgressList: Array<LeaderboardObject>;

    publicUserDataObservable: Observable<any>;
    publicUserData: any;

    fakeUserDataObservable: Observable<any>;
    fakeUserData: any;

    tempUsername: string;

    currentUser: User;
    userObservable: Observable<any>;
    userGroup = false;
    userGroupTwo = false;
    userGroupThree = false;
    userGroupFour = false;
    userGroupDefault = false;


    constructor(private router: Router, private challService: ChallengeService, private goalService: GoalService,
                private trophyService: TrophyService, private userService: UserService, private location: Location) {
    }

    /**
     * first get all important observables with the corresponding database queries
     */
    ngOnInit() {
        this.publicUserDataObservable = this.userService.getUsersPublicData();
        this.publicUserDataObservable.subscribe(data => this.publicUserData = data);

        this.fakeUserDataObservable = this.userService.getUsersFakeData();
        this.fakeUserDataObservable.subscribe(data => this.fakeUserData = data);

        // set chart active if rewards group is assigned to group
        // gets user group id from current user and subscribes with the id to update group
        this.group = this.userService.getUsergroup(); // get user group id for current user
        this.group.subscribe(group => this.updateGroup(group));

        this.userLeaderboardValueObserve = this.goalService.getUserLeaderboardValue();
        this.userLeaderboardValueObserve.subscribe(value => this.getValue(value));

        this.age = this.userService.getUserAge();
        this.age.subscribe(age => this.getAge(age));

        this.gender = this.userService.getUserGender();
        this.gender.subscribe(gender => this.userGender = gender);

        this.userObservable = this.userService.getUser();
        this.userObservable.subscribe(user => this.currentUser = user);
        this.userObservable.subscribe(user => this.getGender(user));

        // if rewards is true get trophies and challenges for leaderboard
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
        // this.generateGoalWinsList();
        // this.generateGoalProgressList();
    }

    viewProfile(uid?) {
        if (!uid) {
            this.router.navigateByUrl('/menu/profile/profile/detail');
            return;
        }

        const navigationExtras: NavigationExtras = {
            queryParams: {
                special: JSON.stringify(uid)
            }
        };
        this.router.navigate(['/menu/profile/profile/view'], navigationExtras);
    }
    // passed group id and returns feature vector to config
    updateGroup(group) {
        this.config = this.userService.getGroupconfig(group); // gets feature vector
        this.config.subscribe(config => this.setPages(config));
        if (group === '-MRswf3GJ21lpbBDtX3u'){
            this.userGroup = true;
            this.userGroupTwo = false;
            this.userGroupThree = false;
            this.userGroupFour = false;
            this.ranking = 'activeMinutesOne';
            this.generateActiveMinutesListOne();
        } else if (group === '-MV0EDdoLe_YwNuDyNLm'){
            this.userGroupTwo = true;
            this.userGroup = false;
            this.userGroupThree = false;
            this.userGroupFour = false;
            this.ranking = 'activeMinutesTwo';
            this.generateActiveMinutesListTwo();
        } else if (group === '-MV0EUE_DIEXALMM1MW5'){
            this.userGroupThree = true;
            this.userGroup = false;
            this.userGroupTwo = false;
            this.userGroupFour = false;
            this.ranking = 'activeMinutesThree';
            this.generateActiveMinutesListThree();
        } else if (group === '-MV0Ef1ynIXmBZUVRsXw'){
            this.userGroupFour = true;
            this.userGroup = false;
            this.userGroupTwo = false;
            this.userGroupThree = false;
            this.ranking = 'activeMinutesFour';
            this.generateActiveMinutesListFour();
        } else {
            this.userGroupDefault = true;
            this.generateActiveMinutesList();
        }
    }

    getValue(value) {
        this.userLeaderboardValue = value;
        console.log(this.userLeaderboardValue);
    }

    getGender(user) {
        this.userGender = user.gender;
        console.log(this.userGender);
    }

    getAge(age) {
        this.userAge = age;
    }
    // set rewards to true if config for rewards is available
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
                const entity1 = await new LeaderboardObject(element.id, element.won.length, this.publicUserData);
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
                const entity1 = await new LeaderboardObject(element.id, element.won.length - 1, this.publicUserData);
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
                    const entity1 = new LeaderboardObject(element.id, element.activity, this.publicUserData);
                    testArray.push(entity1);
                }
            }
        }
        this.activitiesModerate = this.sortArrays(testArray);
    }

    generateActiveMinutesList() {
        this.goalService.getLeaderboardGoals('absolute', 'weekly-active')
            .subscribe(result => {
                if (!result) {
                    this.activitiesModerate = [];
                    return;
                }
                console.log(result);
                const testarray = Object.keys(result)
                    .map(uid => new LeaderboardObject(uid, result[uid], this.publicUserData));
                this.activitiesModerate = this.sortArrays(testarray);
                console.log(this.activitiesModerate);
            });
    }

    generateActiveMinutesListOne() {
        this.goalService.getLeaderboardGoals('absolute', 'weekly-active')
            .subscribe(result => {
                if (!result) {
                    this.activitiesModerateOne = [];
                    return;
                }
                this.valueDif = this.userLeaderboardValue * 1.6;
                console.log(this.valueDif);
                console.log(result);
                const testarray = Object.keys(result)
                    .map(uid => new LeaderboardObject(uid, result[uid], this.fakeUserData));
                console.log(testarray);
                let array1 = testarray.filter(user => Math.abs(this.userAge - user.age) >= 10 && user.gender !== this.userGender &&
                    user.value >= this.valueDif && user.uid.includes('fakeuser'));

                console.log(array1);
                if (array1.length > 4) {
                    array1.length = 4;
                }
                let array2 = testarray.filter(user => Math.abs(this.userAge - user.age) >= 10 && user.gender !== this.userGender &&
                    user.value <= this.userLeaderboardValue && user.uid.includes('fakeuser') && array1.includes(user) === false);
                console.log(array2);
                this.activitiesModerateOne = array1.concat(array2);
                if(this.activitiesModerateOne.length > 9) {
                    this.activitiesModerateOne.length = 9;
                }
                this.activitiesModerateOne.push(new LeaderboardObject(firebase.auth().currentUser.uid, result[firebase.auth().currentUser.uid], this.publicUserData));
                this.activitiesModerateOne = this.sortArrays(this.activitiesModerateOne);
            });
    }

    generateActiveMinutesListTwo() {
        this.goalService.getLeaderboardGoals('absolute', 'weekly-active')
            .subscribe(result => {
                if (!result) {
                    this.activitiesModerateTwo = [];
                    return;
                }
                this.valueDif = this.userLeaderboardValue * 1.6;
                console.log(this.valueDif);
                console.log(result);
                const testarray = Object.keys(result)
                    .map(uid => new LeaderboardObject(uid, result[uid], this.fakeUserData));
                console.log(testarray);
                let array1 = testarray.filter(user => Math.abs(this.userAge - user.age) <= 5 && user.gender === this.userGender &&
                    user.value >= this.valueDif && user.uid.includes('fakeuser'));

                console.log(array1);
                if (array1.length > 4) {
                    array1.length = 4;
                }
                let array2 = testarray.filter(user => Math.abs(this.userAge - user.age) <= 5 && user.gender === this.userGender &&
                    user.value <= this.userLeaderboardValue && user.uid.includes('fakeuser') && array1.includes(user) === false);
                console.log(array2);
                this.activitiesModerateTwo = array1.concat(array2);
                if(this.activitiesModerateTwo.length > 9) {
                    this.activitiesModerateTwo.length = 9;
                }
                this.activitiesModerateTwo.push(new LeaderboardObject(firebase.auth().currentUser.uid, result[firebase.auth().currentUser.uid], this.publicUserData));
                this.activitiesModerateTwo = this.sortArrays(this.activitiesModerateTwo);
            });
    }
    generateActiveMinutesListThree() {
        this.goalService.getLeaderboardGoals('absolute', 'weekly-active')
            .subscribe(result => {
                if (!result) {
                    this.activitiesModerateThree = [];
                    return;
                }
                this.valueDif = this.userLeaderboardValue * 1.2;
                this.valueDif2 = this.userLeaderboardValue * 0.8;
                console.log(this.valueDif);
                console.log(result);
                const testarray = Object.keys(result)
                    .map(uid => new LeaderboardObject(uid, result[uid], this.fakeUserData));
                console.log(testarray);
                testarray.map(user => user.value = this.userLeaderboardValue + Math.floor(Math.random() * 35) *  (Math.round(Math.random()) ? 1 : -1));
                console.log(Math.floor(Math.random() * 25) + 1);
                let array1;
                if (this.userLeaderboardValue <= 50){
                    array1 = testarray.filter(user => Math.abs(this.userAge - user.age) >= 10 && user.gender !== this.userGender &&
                        user.value >= this.userLeaderboardValue && user.uid.includes('fakeuser'));
                }
                else {
                    array1 = testarray.filter(user => Math.abs(this.userAge - user.age) >= 10 && user.gender !== this.userGender &&
                    user.value <= this.valueDif && user.value >= this.userLeaderboardValue && user.uid.includes('fakeuser'));
                }

                console.log(array1);
                if (array1.length > 4) {
                    array1.length = 4;
                }
                let array2;
                if (this.userLeaderboardValue <= 50){
                    array2 = testarray.filter(user => Math.abs(this.userAge - user.age) >= 10 && user.gender !== this.userGender &&
                        user.value <= this.userLeaderboardValue && user.value >= 0 && user.uid.includes('fakeuser') && array1.includes(user) === false);
                }
                else {
                    array2 = testarray.filter(user => Math.abs(this.userAge - user.age) >= 10 && user.gender !== this.userGender &&
                    user.value <= this.userLeaderboardValue && user.value >= this.valueDif2 && user.uid.includes('fakeuser') && array1.includes(user) === false);
                }
                console.log(array2);
                this.activitiesModerateThree = array1.concat(array2);
                if(this.activitiesModerateThree.length > 9) {
                    this.activitiesModerateThree.length = 9;
                }
                this.activitiesModerateThree.push(new LeaderboardObject(firebase.auth().currentUser.uid, result[firebase.auth().currentUser.uid], this.publicUserData));
                this.activitiesModerateThree = this.sortArrays(this.activitiesModerateThree);
            });
    }

    generateActiveMinutesListFour() {
        this.goalService.getLeaderboardGoals('absolute', 'weekly-active')
            .subscribe(result => {
                if (!result) {
                    this.activitiesModerateFour = [];
                    return;
                }
                this.valueDif = this.userLeaderboardValue * 1.2;
                this.valueDif2 = this.userLeaderboardValue * 0.8;
                console.log(this.valueDif);
                console.log(result);
                const testarray = Object.keys(result)
                    .map(uid => new LeaderboardObject(uid, result[uid], this.fakeUserData));
                console.log(testarray);
                testarray.map(user => user.value = this.userLeaderboardValue + Math.floor(Math.random() * 25) *  (Math.round(Math.random()) ? 1 : -1));
                let array1;
                if (this.userLeaderboardValue <= 50){
                    array1 = testarray.filter(user => Math.abs(this.userAge - user.age) <= 5 && user.gender === this.userGender
                         && user.value >= this.userLeaderboardValue && user.uid.includes('fakeuser'));
                }
                else {
                array1 = testarray.filter(user => Math.abs(this.userAge - user.age) <= 5 && user.gender === this.userGender &&
                    user.value <= this.valueDif && user.value >= this.userLeaderboardValue && user.uid.includes('fakeuser'));
                }
                console.log(array1);
                if (array1.length > 4) {
                    array1.length = 4;
                }
                let array2;
                if (this.userLeaderboardValue <= 50){
                    array2 = testarray.filter(user => Math.abs(this.userAge - user.age) <= 5 && user.gender === this.userGender &&
                        user.value <= this.userLeaderboardValue && user.value >= 0 && user.uid.includes('fakeuser') && array1.includes(user) === false);
                }
                else {
                    array2 = testarray.filter(user => Math.abs(this.userAge - user.age) <= 5 && user.gender === this.userGender &&
                        user.value <= this.userLeaderboardValue && user.value >= this.valueDif2 && user.uid.includes('fakeuser') && array1.includes(user) === false);
                }
                console.log(array2);
                this.activitiesModerateFour = array1.concat(array2);
                if(this.activitiesModerateFour.length > 9) {
                    this.activitiesModerateFour.length = 9;
                }
                this.activitiesModerateFour.push(new LeaderboardObject(firebase.auth().currentUser.uid, result[firebase.auth().currentUser.uid], this.publicUserData));
                this.activitiesModerateFour = this.sortArrays(this.activitiesModerateFour);
            });
    }

    // generateGoalProgressList() {
    //     this.goalService.getLeaderboardGoals('relative', 'weekly-active')
    //         .subscribe(result => {
    //             if (!result) {
    //                 return;
    //             }
    //
    //             const testarray = Object.keys(result).map(uid => new LeaderboardObject(uid, result[uid], this.publicUserData));
    //             this.goalProgressList = this.sortArrays(testarray);
    //             console.log(this.goalProgressList);
    //         });
    // }

    // generateGoalWinsList() {
    //     const nGoals = this.goalService.getLeaderboardGoals('nWins', '');
    //     nGoals.subscribe(goalList => {
    //         if (goalList) {
    //             const testarray = Object.keys(goalList)
    //                 .map(uid => new LeaderboardObject(uid, goalList[uid], this.publicUserData));
    //             this.goalWinsList = this.sortArrays(testarray);
    //             console.log(this.goalWinsList);
    //         }
    //     });
    // }

    /**
     * this method sorts all arrays for the leaderboard visualization
     */
    sortArrays(array) {
        if (array !== undefined && Array.isArray(array)) {
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
