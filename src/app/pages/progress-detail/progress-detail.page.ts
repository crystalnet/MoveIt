import {Component, OnInit, ViewChild} from '@angular/core';
import {ActivityService} from '../../services/activity/activity.service';
import {Activity} from '../../model/activity';
import {combineLatest, merge, Observable} from 'rxjs';
import {GoalService} from '../../services/goal/goal.service';
import {Goal} from '../../model/goal';
import {Location} from '@angular/common';
import {Health} from '@ionic-native/health/ngx';
import {IonSlides, NavController, Platform} from '@ionic/angular';
import {Router} from '@angular/router';
import {Chart} from 'chart.js';
import {map} from 'rxjs/operators';
import * as moment from 'moment';

@Component({
    selector: 'app-progress-detail',
    templateUrl: './progress-detail.page.html',
    styleUrls: ['./progress-detail.page.scss'],


})
export class ProgressDetailPage implements OnInit {
    dailyActivePromise: Promise<any>;
    dailyActive: Goal;
    weeklyActivePromise: Promise<any>;
    weeklyActive: Goal;

    currentGoals: any;
    goalHistory: any;

    activities: Observable<Activity[]>;
    // Array which contains the displayed activities
    displayedActivities: Observable<Activity[]>;
    duration = 'day';

    activitiesChartData;
    public chartLabelsProgress: any = [];
    public chartValuesModerate: any = [];
    public chartValuesVigorous: any = [];
    public chartValuesWeight: any = [];
    public chartColours: any = [];
    public chartHoverColours: any = [];


    @ViewChild('slides', {static: false}) slides: IonSlides;
    @ViewChild('barChart', {static: false}) barChart: { nativeElement: any; };
    @ViewChild('hrzBarChart5', {static: false}) hrzBarChart5: { nativeElement: any; };
    @ViewChild('weeklyChart', {static: false}) weeklyChart: { nativeElement: any; };

    // barChart: any;

    hrzBars5: any;
    weeklyBarChart: any;
    progressChartData: any;
    public chartLabelsActivities: any = [];

    slideOpts = {
        initialSlide: 4
    };
    wonGoals: any;
    wonGoalsName: any;
    allInfo: any[] = [];
    goalsHistory: Array<Goal>;
    lastGoalM = 0;
    lastGoalV = 0;
    lastGoalW = 0;
    activitiesGoals: Array<Activity>;
    relative: number;
    wholeDuration: any[];
    relativeV: number;
    relativeW: number;

    oldGoals: any[] = [];


    constructor(private activityService: ActivityService, private goalService: GoalService, private location: Location,
                private health: Health, private platform: Platform, private router: Router, private navCtrl: NavController) {
        const history = this.goalService.getGoalHistory();
        const current = this.goalService.getGoals();
        combineLatest(history, current).subscribe((results) => {
            console.log('ENTERED');
            this.goalHistory = results[0];
            this.currentGoals = results[1];
            this.prepareProgressChartData();
        });

        this.activities = this.activityService.getAllUserActivities();


        this.displayedActivities = this.activities.pipe(map(
            (data) => {
                // data.sort((a, b) => {
                //   return b.startTime.getTime() - a.startTime.getTime();
                // });
                return data.slice(0, 5);
            }
        ));

        this.dailyActivePromise = this.goalService.getGoal('daily-active').then(res => this.dailyActive = res, err => console.log(err));
        this.weeklyActivePromise = this.goalService.getGoal('weekly-active').then(res => this.weeklyActive = res, err => console.log(err));

        // this.prepareProgressChartData();
        // this.defineChartData();
        // this.loadOldGoals();
    }

    ionViewDidEnter() {
    }

    loadMoreActivities() {
        let currentlyDisplayed = 0;
        this.displayedActivities.subscribe(
            c => currentlyDisplayed = c.length
        );

        const newDisplayedActivities = this.activities.pipe(
            map(data => data.slice(0, currentlyDisplayed + 5))
        );

        this.displayedActivities = merge(
            this.displayedActivities,
            newDisplayedActivities
        );
    }

    prepareProgressChartData() {
        const that = this;

        this.chartLabelsProgress = [];
        const weeklyProgress = [];
        const intensities = Goal.intensities; // ['moderate','vigorous']
        const duration = Goal.durations[1]; // 'weekly'
        const start = moment().startOf('week').endOf('day').add(1, 'day');
        const current = start.clone();
        const today = (moment().get('day') + 7 - 1) % 7;

        // Prepare weekly activities with days -6 days until today as indices and initialize with empty array
        for (const intensity of intensities) {
            current.set(start.toObject());
            weeklyProgress[intensity] = new Array(7);
            for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
                let value = 0;
                const history = this.goalHistory[`${duration}-${intensity}`];
                if (dayOfWeek > today) {
                    value = null;
                } else if (dayOfWeek === today) {
                    value = this.currentGoals.filter(el => el.name === `${duration}-${intensity}`)[0].relative;
                } else if (history && history.hasOwnProperty(current.valueOf())) {
                    value = history[current.valueOf()].relative;
                }
                weeklyProgress[intensity][dayOfWeek] = value;
                if (that.chartLabelsProgress.length < 7) {
                    that.chartLabelsProgress.push(current.format('ddd'));
                }
                current.add(1, 'day');
            }
        }
        this.progressChartData = weeklyProgress;
        console.log(weeklyProgress);
        console.log(that.chartLabelsProgress);

        that.createProgressChart();
    }

    // weekly
    prepareActivitiesChartData() {
        const that = this;

        this.chartLabelsActivities = [];
        const weeklyActivities = [];
        const intensities = Goal.intensities; // ['moderate','vigorous']
        const duration = Goal.durations[0]; // 'daily'
        const start = moment().endOf('day').subtract(6, 'day');
        const current = start.clone();

        // Prepare weekly activities with days -6 days until today as indices and initialize with empty array
        for (const intensity of intensities) {
            current.set(start.toObject());
            weeklyActivities[intensity] = new Array(7);
            for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
                let value = 0;
                const history = this.goalHistory[`${duration}-${intensity}`];
                if (history && history.hasOwnProperty(current.valueOf())) {
                    value = history[current.valueOf()].current;
                }
                weeklyActivities[intensity][dayOfWeek] = value;
                if (that.chartLabelsActivities.length < 7) {
                    that.chartLabelsActivities.push(current.format('ddd'));
                }
                current.add(1, 'day');
            }
            console.log(this.currentGoals);
            weeklyActivities[intensity][6] = this.currentGoals.filter(el => el.name === `${duration}-${intensity}`)[0].current;
        }
        this.activitiesChartData = weeklyActivities;
        console.log(weeklyActivities);
        console.log(that.chartLabelsActivities);

        that.createActivitiesChart();
    }


    createProgressChart() {
        if (this.hrzBars5) {
            this.hrzBars5.destroy();
        }

        const ctx = this.hrzBarChart5.nativeElement;
        // ctx.height = 400;

        this.hrzBars5 = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.chartLabelsProgress,
                datasets: [
                    {
                        label: 'moderate',
                        data: this.progressChartData.moderate,
                        backgroundColor: '#F61067', // array should have same number of elements as number of dataset
                        borderColor: '#F61067', // array should have same number of elements as number of dataset
                        borderWidth: 1
                    },
                    {
                        label: 'vigorous',
                        data: this.progressChartData.via,
                        backgroundColor: '#6DECAF', // array should have same number of elements as number of dataset
                        borderColor: '#6DECAF', // array should have same number of elements as number of dataset
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    xAxes: [{
                        scaleLabel: {
                            display: true,
                            labelString: 'Hour'
                        },
                        /*type: 'time',
                        time: {
                            unit: 'day',
                            displayFormats: {
                                day: 'DD'
                            }
                        },*/
                        barPercentage: 0.9,
                        gridLines: {
                            display: false
                        },
                        stacked: true
                    }],
                    yAxes: [{
                        scaleLabel: {
                            display: true,
                            labelString: 'Minutes'
                        },
                        ticks: {
                            beginAtZero: true,
                            suggestedMin: 0,
                            suggestedMax: 1
                        },
                        stacked: true
                    }]
                }
            }
        });
    }


    createActivitiesChart() {
        if (this.weeklyBarChart) {
            this.weeklyBarChart.destroy();
        }

        const ctx = this.weeklyChart.nativeElement;
        // ctx.height = 400;

        this.weeklyBarChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: this.chartLabelsActivities,
                datasets: [
                    {
                        label: 'moderate',
                        data: this.activitiesChartData.moderate,
                        backgroundColor: '#F61067', // array should have same number of elements as number of dataset
                        borderColor: '#F61067', // array should have same number of elements as number of dataset
                        borderWidth: 1
                    },
                    {
                        label: 'vigorous',
                        data: this.activitiesChartData.vigorous,
                        backgroundColor: '#6DECAF', // array should have same number of elements as number of dataset
                        borderColor: '#6DECAF', // array should have same number of elements as number of dataset
                        borderWidth: 1
                    }
                ]
            },
            options: {
                scales: {
                    xAxes: [{
                        scaleLabel: {
                            display: true,
                            labelString: 'Day'
                        },
                        /*type: 'time',
                        time: {
                            unit: 'day',
                            displayFormats: {
                                day: 'DD'
                            }
                        },*/
                        barPercentage: 0.9,
                        gridLines: {
                            display: false
                        },
                        stacked: true
                    }],
                    yAxes: [{
                        scaleLabel: {
                            display: true,
                            labelString: 'Minutes'
                        },
                        ticks: {
                            beginAtZero: true
                        },
                        stacked: true
                    }]
                }
            }
        });
    }

    ngOnInit() {
        // this.checkPlatformReady();
    }

    async checkPlatformReady() {
        const ready = !!await this.platform.ready();
        if (ready) {
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
                            this.loadHealthData();
                        }
                    ).catch(e => console.log(e));
                })
                .catch(e => console.log(e));
        }
    }


    saveWorkout() {
        /*
       this.health.requestAuthorization([

           'activity'
       ])
           .then(
               res => console.log(res))
           .catch(e => console.log(e));
       this.health.store({
           startDate: new Date(new Date().getTime() - 3 * 60 * 1000), // three minutes ago
           endDate: new Date(),
           dataType: 'activity',
           value: 'walking',
           sourceName: 'MoveIt_test',
           sourceBundleId: 'com.moveitproject.www'
       }).then(res => console.log('Response of API while writing' + res))
           .catch(e => console.log('Response of API while writing ERROR:' + e));
           */
        const activity = new Activity();
        activity.endTime = new Date();
        activity.startTime = new Date(new Date().getTime() - 3 * 60 * 1000); // three minutes ago

        this.activityService.writeFitnessApi(activity);
    }

    loadHealthData() {

    }


    goBack() {
        this.location.back();
    }

    routeToEditGoalPage(goal: Goal) {
        this.router.navigateByUrl('/menu/goals/goals/detail', {state: {goal}});
    }

    routeToEditPage(activity: Activity) {
        this.router.navigateByUrl('/menu/progress/progress/edit', {state: {activity}});
    }

    /**
     * Create a new activity
     *
     * An activity object must be present in order to do so. This must be created from the user input
     */
    createActivity() {
        // TODO replace with actual activity object
        this.activityService.createActivity(new Activity()).then(
            res => console.log(res),
            err => console.log(err)
        );
    }

    /**
     * Update an existing id
     *
     * An updated activity object and the id of the activity to be updated must be provided
     */
    editActivity() {
        const record = new Activity('-Lx_t1Ch4v1h7sox96XZ', {unit: 'km', value: 42.2});

        // TODO replace with actual activity id
        this.activityService.editActivity('-Lx_t1Ch4v1h7sox96XZ', record).then(
            res => console.log(res),
            err => console.log(err)
        );
    }

    /**
     * Retrieve an activity giving its id
     */
    getActivity() {
        // TODO replace with actual activity id
        this.activityService.getActivity('-Lx_t1Ch4v1h7sox96XZ').then(
            res => {
                console.log(res);
            },
            err => console.log(err)
        );
    }

    /**
     * Retrieves an array of all activities of a current user
     */
    getAllActivities() {
        return this.activityService.getAllUserActivities();
    }

    /**
     * For testing purposes only: Create all default goals for a user
     */
    createGoals() {
        return this.goalService.initializeUserGoals();
    }

    /**
     * Adjusts the target of a goal
     */
    adjustGoal() {
        // Get the goal given a name
        this.goalService.getGoal('dailyModerate').then(
            // If the goal exists, adjust the goal
            goal => this.goalService.adjustGoal(goal, 90).then(
                res => console.log(res), // Goal successfully adjusted
                err => console.log(err) // Goal adjustment failed
            ),
            err => console.log(err) // Fetching the goal failed
        );
    }


    goToOldGoalsPage() {
        this.navCtrl.navigateForward('/menu/progress/progress/goals-old');
    }

    loadOldGoals() {
        const that = this;
        this.allInfo = that.allInfo;
        let latestGoalTimeM = 0;
        let latestGoalTimeV = 0;
        let latestGoalTimeW = 0;

        this.goalService.getGoals().subscribe(data => {
            this.goalsHistory = data;


            this.goalsHistory.forEach((goal) => {

                goal.history.forEach((history) => {
                    for (const hist in history) {
                        if (history.hasOwnProperty(hist)) {

                            const obj = {
                                name: goal.name,
                                val: history[hist],
                                time: hist
                            };
                            that.allInfo.push(obj);
                        }
                    }
                });
            });

            for (let weekNumber = 3; weekNumber >= 0; weekNumber--) {
                const lastSunday = new Date();
                lastSunday.setDate(lastSunday.getDate() - (7 * weekNumber) - lastSunday.getDay());
                lastSunday.setHours(0, 0, 0, 0);


                latestGoalTimeW = 0;
                latestGoalTimeV = 0;
                latestGoalTimeM = 0;
                that.lastGoalM = 0;
                that.lastGoalV = 0;
                that.lastGoalW = 0;
                // console.log(this.allInfo);
                this.allInfo.forEach((changedGoal) => {

                    if (changedGoal.time < lastSunday.getTime()) {
                        //  console.log(changedGoal.val);


                        if (changedGoal.time > latestGoalTimeM && changedGoal.name === 'weeklyModerate') {
                            latestGoalTimeM = changedGoal.time;
                            that.lastGoalM = changedGoal.val;

                        }

                        if (changedGoal.time > latestGoalTimeV && changedGoal.name === 'weeklyVigorous') {
                            latestGoalTimeV = changedGoal.time;
                            that.lastGoalV = changedGoal.val;
                        }


                        if (changedGoal.time > latestGoalTimeW && changedGoal.name === 'weeklyWeight') {
                            latestGoalTimeW = changedGoal.time;
                            that.lastGoalW = changedGoal.val;
                        }
                    }
                    if (that.lastGoalV === 0) {
                        that.lastGoalV = 75;
                    }
                    if (that.lastGoalW === 0) {
                        that.lastGoalW = 120;
                    }
                    if (that.lastGoalM === 0) {
                        that.lastGoalM = 150;
                    }
                });

                if (this.allInfo.length === 0) {
                    if (that.lastGoalV === 0) {
                        that.lastGoalV = 75;
                    }
                    if (that.lastGoalW === 0) {
                        that.lastGoalW = 120;
                    }
                    if (that.lastGoalM === 0) {
                        that.lastGoalM = 150;
                    }
                }


                const oldGoalM: any = {
                    name: '',
                    intensiy: '',
                    weekNumber: 0,
                    weekGoal: 0,
                    duration: 0,
                    relative: 0
                };
                const oldGoalV: any = {
                    name: '',
                    intensiy: '',
                    weekNumber: 0,
                    weekGoal: 0,
                    duration: 0,
                    relative: 0
                };
                const oldGoalW: any = {
                    name: '',
                    intensiy: '',
                    weekNumber: 0,
                    weekGoal: 0,
                    duration: 0,
                    relative: 0
                };
                oldGoalM.name = 'weekly ' + (weekNumber + 1) + ' ago';
                oldGoalM.weekNumber = weekNumber;
                oldGoalM.intensity = 'moderate';
                oldGoalM.weekGoal = that.lastGoalM;
                that.oldGoals.push(oldGoalM);

                oldGoalV.name = 'weekly ' + (weekNumber + 1) + ' ago';
                oldGoalV.weekNumber = weekNumber;
                oldGoalV.intensity = 'vigorous';
                oldGoalV.weekGoal = that.lastGoalV;
                that.oldGoals.push(oldGoalV);

                oldGoalW.name = 'weekly ' + (weekNumber + 1) + ' ago';
                oldGoalW.weekNumber = weekNumber;
                oldGoalW.intensity = 'weight training';
                oldGoalW.weekGoal = that.lastGoalW;
                that.oldGoals.push(oldGoalW);

                // console.log(that.oldGoals);
            }


        });
        this.activitiesFromLastWeek();
    }

    activitiesFromLastWeek() {
        const that = this;
        let lastWekkActivities = [];

        this.activities.subscribe(data => {
            // console.log(data);
            for (let weekNumber = 3; weekNumber >= 0; weekNumber--) {
                this.activitiesGoals = [];
                lastWekkActivities = [];
                const lastSunday = new Date();
                const lastSecSunday = new Date();
                lastSunday.setDate(lastSunday.getDate() - (7 * weekNumber) - lastSunday.getDay());
                lastSunday.setHours(0, 0, 0, 0);
                lastSecSunday.setDate(lastSecSunday.getDate() - (7 * weekNumber) - lastSecSunday.getDay() - 7);
                lastSecSunday.setHours(0, 0, 0, 0);

                lastWekkActivities.push(data.filter((activity) => {
                    return activity.startTime.getTime() < lastSunday.getTime() && activity.startTime.getTime() > lastSecSunday.getTime();
                }));
                this.activitiesGoals = lastWekkActivities;

                const intensities = [
                    {id: 'vigorous', name: 'vigorous'},
                    {id: 'moderate', name: 'moderate'},
                    {id: 'weightTraining', name: 'weight training'}
                ];

                const weeklyActivityDurations = [];
                lastWekkActivities.forEach((weekly) => {
                    const obj = {
                        vigorous: [],
                        moderate: [],
                        weightTraining: []
                    };
                    intensities.forEach((intensity) => {
                        obj[intensity.id] = weekly
                            .filter((activity) => activity.intensity === intensity.name)
                            .reduce(((totalDuration, activity) => totalDuration + activity.getDuration()), 0);
                    });

                    weeklyActivityDurations.push(obj);
                });
                this.wholeDuration = weeklyActivityDurations;
                let moderate: any;
                let vigorous: any;
                let weight: any;
                moderate = this.wholeDuration.map((intensity) => intensity.moderate);
                vigorous = this.wholeDuration.map((intensity) => intensity.vigorous);
                weight = this.wholeDuration.map((intensity) => intensity.weightTraining);
                console.log(weight);

                this.oldGoals.forEach((goal) => {
                    if (goal.intensity === 'moderate' && goal.weekNumber === weekNumber) {
                        goal.duration = moderate;
                        goal.relative = goal.duration / goal.weekGoal;
                    }
                    if (goal.intensity === 'vigorous' && goal.weekNumber === weekNumber) {
                        goal.duration = vigorous;
                        goal.relative = goal.duration / goal.weekGoal;
                    }
                    if (goal.intensity === 'weight training' && goal.weekNumber === weekNumber) {
                        goal.duration = weight;
                        goal.relative = goal.duration / goal.weekGoal;
                    }

                });
                // console.log(this.oldGoals);

            }
        });
    }

    slidePrev() {
        this.slides.slidePrev();
    }

    slideNext() {
        this.slides.slideNext();
    }

}

