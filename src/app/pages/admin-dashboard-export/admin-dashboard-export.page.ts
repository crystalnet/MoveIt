import {Component, OnInit} from '@angular/core';
import {ExportService} from '../../services/export/export.service';
import {UserService} from 'src/app/services/user/user.service';
import {Group} from 'src/app/model/group';
import {User} from 'src/app/model/user';
import * as moment from 'moment-timezone';
import {Activity} from '../../model/activity';
import {Goal} from '../../model/goal';
import {ActionLog} from '../../model/actionLog';
// @ts-ignore
import * as stringify from 'fast-json-stable-stringify';
import {isObject} from 'util';

@Component({
    selector: 'app-admin-dashboard-export',
    templateUrl: './admin-dashboard-export.page.html',
    styleUrls: ['./admin-dashboard-export.page.scss'],
})
export class AdminDashboardExportPage implements OnInit {
    users: Array<User>;
    groups: Array<Group>;
    select: any;
    currentUid = '';
    testUserIds = [];
    intervalBefore = 60;
    intervalAfter = 60;

    constructor(private exportService: ExportService, private userService: UserService) {
        this.userService.getGroups().subscribe(val => this.groups = val);
        this.userService.getUsers().subscribe(val => this.users = val);
    }

    ngOnInit() {
    }

    export(entity, scope, value) {
        console.log(scope);
        console.log(entity);
        if (scope === 'user') {
            this.exportService.export(entity, scope, value);
        } else if (scope === 'group') {
            this.exportService.export(entity, scope, value);
        } else if (scope === 'all') {
            this.exportService.export(entity, scope, 'all');
        }
    }

    exportDb() {
        this.exportService.exportDb();
    }

    exportAdvanced() {
        return new Promise((resolve, reject) => {
            this.readTextFile('../../assets/moveit-2019-export.json').then((dataJson: string) => {
                const data = JSON.parse(dataJson);
                const start = moment('29/03/2021', 'DD/MM/YYYY').tz('Europe/Berlin').startOf('day');
                const end = moment('26/04/2021', 'DD/MM/YYYY').tz('Europe/Berlin').startOf('day');

                // CLEAN TEST USER DATA
                this.testUserIds = ['G50FFL3MwFOCYfgCH2TG8760u6n2', 'aqm3UNtIfbTZ4KBU0roOtni4E9i2', 'ugF50EweX7bA3S0HSUrNCHroYKv1',
                    'siTBI3WRatPBrEJQRnkf2SQncNr2', 'LnwkDHpGmdckzq34mlapDQUkz0B3', 'M634kF5ljvc97pcKEd3ljl0FyLm1',
                    'L8osUF2xq0fHN7L0vcrsH3QeKKD3',
                    'X7kUj9Ws84ayqUyGyFy0fugEhVE3',
                    '4LH75ehb5EanPmNU3zcYMLb9wcZ2',
                    'IPZqisfh1uSVEmtGjaOyZTi3VJp1',
                    'QoKHlpi9rVUQpSlJt4Uu4Tv7Uct2',
                    'UX7uwLdpDbNcu8MPPrDRtpbCIQm2'];

                const locations = ['users', 'publicUserData', 'activities', 'goalHistory', 'goals', 'tracking'];
                for (const uid of this.testUserIds) {
                    for (const location of locations) {
                        if (data[location][uid]) {
                            delete data[location][uid];
                        }
                    }
                    // for (const postId of Object.keys(data['posts']['groups']['-MHLIf7AA2gG7wB5WX_q'])) {
                    //     const post = data['posts']['groups']['-MHLIf7AA2gG7wB5WX_q'][postId];
                    //     if (post.user === uid) {
                    //         delete data['posts']['groups']['-MHLIf7AA2gG7wB5WX_q'][postId];
                    //     }
                    // }
                }
                // REMOVE TEST USERS FROM TIMES
                for (const hour of Object.keys(data.times.social)) {
                    if (!data.times.social[hour]) {
                        continue;
                    }
                    for (const minute of Object.keys(data.times.social[hour])) {
                        if (!data.times.social[hour][minute]) {
                            continue;
                        }
                        for (const key of Object.keys(data.times.social[hour][minute])) {
                            const entry = data.times.social[hour][minute][key];
                            if (this.testUserIds.includes(entry)) {
                                delete data.times.social[hour][minute][key];
                            }
                        }
                    }
                }

                for (const hour of Object.keys(data.times.progress)) {
                    if (!data.times.progress[hour]) {
                        continue;
                    }
                    for (const minute of Object.keys(data.times.progress[hour])) {
                        if (!data.times.progress[hour][minute]) {
                            continue;
                        }
                        for (const key of Object.keys(data.times.progress[hour][minute])) {
                            const entry = data.times.progress[hour][minute][key];
                            if (this.testUserIds.includes(entry)) {
                                delete data.times.progress[hour][minute][key];
                            }
                        }
                    }
                }

                // CLEAN ACTIVITIES BY DATE AND ADD DURATION
                for (const uid of Object.keys(data.activities)) {
                    for (const activityId of Object.keys(data.activities[uid])) {
                        const activity = data.activities[uid][activityId];
                        if (activity.startTime >= end.valueOf() || activity.endTIme <= start.valueOf()) {
                            delete data.activities[uid][activityId];
                        } else {
                            activity.duration = activity.endTime - activity.startTime;
                            const moderateActivities = ['biking', 'gardening', 'golf', 'hiking', 'housework', 'meditation', 'on_bicycle', 'on_foot', 'stair_climbing', 'tilting', 'walking', 'walking_stroller', 'walking_treadmill', 'other'];
                            if (moderateActivities.includes(activity.type)) {
                                activity.intensity = 'moderate';
                            }
                        }
                    }
                }

                // CLEAN GOAL HISTORIES BY DATE
                for (const uid of Object.keys(data.goalHistory)) {
                    for (const goalHistoryId of Object.keys(data.goalHistory[uid])) {
                        if (parseInt(goalHistoryId, 10) >= end.valueOf() || parseInt(goalHistoryId, 10) <= start.valueOf()) {
                            delete data.goalHistory[uid][goalHistoryId];
                        }
                    }
                }

                // CLEAN TRACKING BY DATE AND UNIFORM REACTIONS
                for (const uid of Object.keys(data.tracking)) {
                    if (data.tracking[uid].actionLogs) {
                        for (const actionLogId of Object.keys(data.tracking[uid].actionLogs)) {
                            const time = data.tracking[uid].actionLogs[actionLogId].timestamp;
                            if (parseInt(time, 10) >= end.valueOf() || parseInt(time, 10) <= start.valueOf()) {
                                delete data.tracking[uid].actionLogs[actionLogId];
                            }
                        }
                    } else {
                        data.tracking[uid].actionLogs = {};
                    }
                    if (data.tracking[uid].reactions) {
                        for (const reactionId of Object.keys(data.tracking[uid].reactions)) {
                            const reaction = data.tracking[uid].reactions[reactionId];
                            if (parseInt(reaction.time, 10) >= end.valueOf() || parseInt(reaction.time, 10) <= start.valueOf()) {
                                delete data.tracking[uid].reactions[reactionId];
                            } else if (reaction.type) {
                                const newEntry = {
                                    notification: reaction.notificationType,
                                    response: reaction.response,
                                    time: reaction.time,
                                    type: reaction.type
                                };
                                delete data.tracking[uid].reactions[reactionId];
                                data.tracking[uid].reactions[reactionId] = newEntry;
                            } else {
                                reaction.type = '';
                            }
                        }
                    }
                    if (data.tracking[uid].viewLogs) {
                        for (const view of Object.keys(data.tracking[uid].viewLogs)) {
                            for (const viewLogId of Object.keys(data.tracking[uid].viewLogs[view])) {
                                const viewLog = data.tracking[uid].viewLogs[view][viewLogId];
                                if (parseInt(viewLog.startTime, 10) >= end.valueOf() || parseInt(viewLog.endTime, 10) <= start.valueOf()) {
                                    delete data.tracking[uid].viewLogs[view][viewLogId];
                                }
                            }
                        }
                    }
                }

                // DETECT APP OPENINGS
                const viewLogMap = {};
                const viewLogIdMap = {};
                const openings = {};
                const closings = {};
                const diffs = [];
                for (const uid of Object.keys(data.tracking)) {
                    viewLogMap[uid] = {};
                    viewLogIdMap[uid] = {};
                    openings[uid] = [];
                    closings[uid] = [];
                    if (data.tracking[uid].viewLogs) {
                        for (const view of Object.keys(data.tracking[uid].viewLogs)) {
                            for (const viewLogId of Object.keys(data.tracking[uid].viewLogs[view])) {
                                const viewLog = data.tracking[uid].viewLogs[view][viewLogId];
                                viewLogMap[uid][viewLog.startTime] = viewLogId;
                                viewLogMap[uid][viewLog.endTime] = viewLogId;
                                viewLogIdMap[uid][viewLogId] = viewLog;
                            }
                        }

                        let lastIndex = '0';
                        const open = {};
                        const keys = Object.keys(viewLogMap[uid]).sort();
                        for (const log of keys) {
                            if (Object.keys(open).includes(viewLogMap[uid][log])) {
                                delete open[viewLogMap[uid][log]];
                                const diff = (parseInt(log, 10) - parseInt(lastIndex, 10));
                                diffs.push(diff);
                                // if (Object.keys(open).length === 0 && diff > 5000) {
                                if (Object.keys(open).length === 0) {
                                    closings[uid].push(viewLogMap[uid][log]);
                                }
                            } else {
                                const diff = (parseInt(log, 10) - parseInt(lastIndex, 10));
                                diffs.push(diff);
                                // if (Object.keys(open).length === 0 && diff > 200) {
                                if (Object.keys(open).length === 0) {
                                    openings[uid].push(viewLogMap[uid][log]);
                                }
                                open[viewLogMap[uid][log]] = 0;
                            }
                            lastIndex = log;
                        }
                    }

                    for (const opening of openings[uid]) {
                        data.tracking[uid].actionLogs[Math.floor(Math.random() * 1000000000).toString()] = new ActionLog('app-opened',
                            viewLogIdMap[uid][opening].view,
                            0,
                            0,
                            new Date(viewLogIdMap[uid][opening].startTime)
                        ).toFirebaseObject();
                    }
                    for (const opening of closings[uid]) {
                        data.tracking[uid].actionLogs[Math.floor(Math.random() * 1000000000).toString()] = new ActionLog('app-closed',
                            viewLogIdMap[uid][opening].view,
                            0,
                            0,
                            new Date(viewLogIdMap[uid][opening].startTime)
                        ).toFirebaseObject();
                    }
                }

                this.exportService.download(
                    'diffs' + '.csv',
                    diffs.reduce((acc, curr) => acc += curr + ';', '')
                );

                resolve(stringify(data));
            }, err => console.log(err));
        });
    }

    readTextFile(file) {
        return new Promise((resolve, reject) => {
            const rawFile = new XMLHttpRequest();
            rawFile.open('GET', file, false);
            rawFile.onreadystatechange = () => {
                if (rawFile.readyState === 4) {
                    if (rawFile.status === 200 || rawFile.status === 0) {
                        resolve(rawFile.responseText);
                    } else {
                        reject(rawFile.statusText);
                    }
                }
            };
            rawFile.send(null);
        });
    }

    analyze() {
        return this.exportAdvanced().then((dataJson: string) => {
            const data = JSON.parse(dataJson);
            const start = moment('29/03/2021', 'DD/MM/YYYY').tz('Europe/Berlin').startOf('day');
            const end = moment('26/04/2021', 'DD/MM/YYYY').tz('Europe/Berlin').startOf('day');

            const decisionPoints = this.iterateDecisionPoints(data, start, end, 0);
            const progressPoints = this.iterateGoalPoints(data, start, end, 0);

            // CLEAN POSTS
            delete data.posts.groups['-1'];
            data.posts.comments = {};
            data.posts.likes = {};
            for (const postId of Object.keys(data.posts.groups['-MHLIf7AA2gG7wB5WX_q'])) {
                const post = data.posts.groups['-MHLIf7AA2gG7wB5WX_q'][postId];
                if (parseInt(post.createdAt, 10) > end.valueOf() || parseInt(post.createdAt, 10) < start.valueOf()) {
                    delete data.posts.groups['-MHLIf7AA2gG7wB5WX_q'][postId];
                    continue;
                }
                if (post.comments) {
                    console.log();
                    for (const commentId of Object.keys(post.comments)) {
                        if (data.posts.comments[post.comments[commentId].uid]) {
                            data.posts.comments[post.comments[commentId].uid] += 1;
                        } else {
                            data.posts.comments[post.comments[commentId].uid] = 1;
                        }
                    }
                    post.comments = post.comments.length;
                } else {
                    post.comments = 0;
                }
                if (post.likes) {
                    for (const uid of post.likes) {
                        if (data.posts.likes[uid]) {
                            data.posts.likes[uid] += 1;
                        } else {
                            data.posts.likes[uid] = 1;
                        }
                    }
                    post.likes = post.likes.length;
                } else {
                    post.likes = 0;
                }
                if (post.user in this.testUserIds) {
                    delete data.posts.groups['-MHLIf7AA2gG7wB5WX_q'][postId];
                }
            }

            // console.log(decisionPoints);
            // console.log(progressPoints);
            // console.log(data.tracking);

            this.exportService.download(
                // 'database_dump_' + (new Date()).toISOString().slice(0, 19).replace(/:/g, '-') + '.json',
                'moveit-2019-export-cleaned' + '.json',
                stringify(data)
            );

            this.exportService.download(
                'decision_points' + '.json',
                JSON.stringify(decisionPoints)
            );

            this.exportService.download(
                'progress_points' + '.json',
                JSON.stringify(progressPoints)
            );
        }, err => console.log(err));
    }

    iterateProgressPoints(data) {
        const progressPoints = {};
        for (const uid of Object.keys(data.tracking)) {
            progressPoints[uid] = {};
            const userReactions = data.tracking[uid].reactions;
            if (!userReactions) {
                console.log('err: no reactions', uid);
                continue;
            }
            for (const reactionId of Object.keys(userReactions)) {
                const reaction = data.tracking[uid].reactions[reactionId];
                if ((reaction.notificationType && reaction.notificationType.includes('progress-notification'))
                    || (reaction.notification && reaction.notification.includes('progress-notification'))) {
                    const current = moment(parseInt(reaction.time, 10)).startOf('minute');

                    const newEntry = {
                        start: current.valueOf(),
                        before: current.clone().subtract(this.intervalBefore, 'minutes').endOf('minute').valueOf(),
                        end: current.add(this.intervalAfter, 'minutes').endOf('minute').valueOf(),
                        activityModerate: 0,
                        activityVigorous: 0,
                        before_activityModerate: 0,
                        before_activityVigorous: 0,
                        actionLog: 0,
                        lastOpened: 0,
                        before_actionLog: 0,
                        posts: 0,
                        likes: 0,
                        comments: 0,
                        notification: reaction.notification ? reaction.notification : reaction.notificationType,
                        lastInteraction: 0,
                        nextInteraction: Infinity
                    };

                    try {
                        const userViews = data.tracking[uid.toString()].viewLogs;
                        const userActivities = data.activities[uid.toString()];
                        const posts = data.posts;
                        const userActionLogs = data.tracking[uid.toString()].actionLogs;
                        const goalHistory = data.goalHistory[uid.toString()];

                        const viewTimes = this.findViews(userViews, newEntry.start, newEntry.end);
                        Object.keys(viewTimes).forEach(view => newEntry[view] = viewTimes[view]);

                        const viewTimesBefore = this.findViews(userViews, newEntry.before, newEntry.start);
                        Object.keys(viewTimesBefore).forEach(view => newEntry['before_' + view] = viewTimesBefore[view]);

                        [newEntry.activityModerate, newEntry.activityVigorous] =
                            this.findActivities(userActivities, newEntry.start, newEntry.end);

                        [newEntry.before_activityModerate, newEntry.before_activityVigorous] =
                            this.findActivities(userActivities, newEntry.before, newEntry.start);

                        [newEntry.posts, newEntry.likes, newEntry.comments] = this.findPosts(posts, uid, newEntry.start, newEntry.end, '-MHLIf7AA2gG7wB5WX_q')
                            .map(entry => entry.length);

                        this.findGoalProgress(userActivities, newEntry.start, goalHistory).forEach(goal => {
                            newEntry[goal.name.replace('-', '_') + '_current'] = goal.current;
                            newEntry[goal.name.replace('-', '_') + '_relative'] = goal.relative;
                            newEntry[goal.name.replace('-', '_') + '_target'] = goal.target;
                        });

                        [newEntry.before_actionLog, newEntry.lastOpened] = this.findActionLogs(userActionLogs, newEntry.before, newEntry.start);
                        [newEntry.actionLog, newEntry.lastOpened] = this.findActionLogs(userActionLogs, newEntry.start, newEntry.end);
                    } catch (e) {
                        console.log(e, this.currentUid);
                    }
                    progressPoints[uid][current.valueOf()] = newEntry;
                }
            }
        }
        return progressPoints;
    }

    iterateGoalPoints(data, start, end, initialDayCount = 0) {
        const decisionPoints = {};
        let day = initialDayCount;
        const iterator = start.clone();

        while (iterator.isBefore(end, 'day')) {
            const current = iterator.clone();
            decisionPoints[day.toString()] = {};
            const dailyDecisionPoints = decisionPoints[day.toString()];
            for (const hours of Object.keys(data.times.progress)) {
                if (!data.times.progress[hours]) {
                    continue;
                }
                for (const minutes of Object.keys(data.times.progress[hours])) {
                    if (!data.times.progress[hours][minutes]) {
                        continue;
                    }
                    current.set('hours', parseInt(hours, 10));
                    current.set('minutes', parseInt(minutes, 10));
                    current.startOf('minute');

                    for (const uid of Object.values(data.times.progress[hours][minutes])) {
                        this.currentUid = uid.toString();
                        const time = current.clone();
                        const newEntry = {
                            startTxt: time.toString(),
                            start: time.valueOf().toString(),
                            before: time.clone().subtract(this.intervalBefore, 'minutes').endOf('minute').valueOf(),
                            beforeTxt: time.clone().subtract(this.intervalBefore, 'minutes').endOf('minute').toString(),
                            endTxt: time.clone().add(this.intervalAfter, 'minutes').endOf('minute').toString(),
                            end: time.clone().add(this.intervalAfter, 'minutes').endOf('minute').valueOf(),
                            reactions: undefined,
                            activityModerate: 0,
                            activityVigorous: 0,
                            before_activityModerate: 0,
                            before_activityVigorous: 0,
                            actionLog: 0,
                            lastOpened: 0,
                            before_actionLog: 0,
                            posts: 0,
                            likes: 0,
                            comments: 0,
                            intervention: ''
                        };

                        try {
                            const userReactions = data.tracking[uid.toString()].reactions;
                            const userViews = data.tracking[uid.toString()].viewLogs;
                            const userActivities = data.activities[uid.toString()];
                            const goalHistory = data.goalHistory[uid.toString()];
                            const posts = data.posts;
                            const userActionLogs = data.tracking[uid.toString()].actionLogs;

                            newEntry.reactions = this.findReactions(userReactions, newEntry.start, newEntry.end);
                            const filteredReactions = newEntry.reactions
                                .filter(el => (el.notification.includes('progress')));
                            if (filteredReactions.length === 0) {
                                newEntry.intervention = 'no entry';
                            } else if (filteredReactions.length === 1) {
                                newEntry.intervention = filteredReactions[0].notification;
                            } else {
                                if (filteredReactions[0].notification === filteredReactions[1].notification) {
                                    newEntry.intervention = filteredReactions[0].notification;
                                    console.log('identical but more than 1 reaction', filteredReactions, uid);
                                } else {
                                    newEntry.intervention = 'more than 1 reaction';
                                    console.log('more than 1 reaction', filteredReactions, uid);
                                }
                            }
                            delete newEntry.reactions;

                            const viewTimes = this.findViews(userViews, newEntry.start, newEntry.end);
                            Object.keys(viewTimes).forEach(view => newEntry[view] = viewTimes[view]);

                            const viewTimesBefore = this.findViews(userViews, newEntry.before, newEntry.start);
                            Object.keys(viewTimesBefore).forEach(view => newEntry['before_' + view] = viewTimesBefore[view]);

                            [newEntry.activityModerate, newEntry.activityVigorous] =
                                this.findActivities(userActivities, newEntry.start, newEntry.end);

                            [newEntry.before_activityModerate, newEntry.before_activityVigorous] =
                                this.findActivities(userActivities, newEntry.before, newEntry.start);

                            [newEntry.posts, newEntry.likes, newEntry.comments] = this.findPosts(posts,
                                uid,
                                newEntry.start,
                                newEntry.end,
                                '-MHLIf7AA2gG7wB5WX_q')
                                .map(entry => entry.length);

                            this.findGoalProgress(userActivities, newEntry.start, goalHistory).forEach(goal => {
                                newEntry[goal.name.replace('-', '_') + '_current'] = goal.current;
                                newEntry[goal.name.replace('-', '_') + '_relative'] = goal.relative;
                                newEntry[goal.name.replace('-', '_') + '_target'] = goal.target;
                            });

                            [newEntry.before_actionLog, newEntry.lastOpened] = this.findActionLogs(userActionLogs, newEntry.before, newEntry.start);
                            [newEntry.actionLog, newEntry.lastOpened] = this.findActionLogs(userActionLogs, newEntry.start, newEntry.end);
                        } catch (e) {
                            console.log(e, this.currentUid);
                        }

                        if (uid in dailyDecisionPoints) {
                            dailyDecisionPoints[uid].push(newEntry);
                        } else {
                            dailyDecisionPoints[uid] = [newEntry];
                        }
                    }
                }
            }
            day += 1;
            iterator.add(1, 'day');
        }
        return decisionPoints;
    }

    iterateDecisionPoints(data, start, end, initialDayCount = 0) {
        const decisionPoints = {};
        let day = initialDayCount;
        const iterator = start.clone();

        while (iterator.isBefore(end, 'day')) {
            const current = iterator.clone();
            decisionPoints[day.toString()] = {};
            const dailyDecisionPoints = decisionPoints[day.toString()];
            for (const hours of Object.keys(data.times.social)) {
                if (!data.times.social[hours]) {
                    continue;
                }
                for (const minutes of Object.keys(data.times.social[hours])) {
                    if (!data.times.social[hours][minutes]) {
                        continue;
                    }
                    current.set('hours', parseInt(hours, 10));
                    current.set('minutes', parseInt(minutes, 10));
                    current.startOf('minute');

                    for (const uid of Object.values(data.times.social[hours][minutes])) {
                        this.currentUid = uid.toString();
                        const time = current.clone();
                        const newEntry = {
                            startTxt: time.toString(),
                            start: time.valueOf().toString(),
                            before: time.clone().subtract(this.intervalBefore, 'minutes').endOf('minute').valueOf(),
                            beforeTxt: time.clone().subtract(this.intervalBefore, 'minutes').endOf('minute').toString(),
                            endTxt: time.clone().add(this.intervalAfter, 'minutes').endOf('minute').toString(),
                            end: time.clone().add(this.intervalAfter, 'minutes').endOf('minute').valueOf(),
                            reactions: undefined,
                            activityModerate: 0,
                            activityVigorous: 0,
                            before_activityModerate: 0,
                            before_activityVigorous: 0,
                            actionLog: 0,
                            lastOpened: 0,
                            before_actionLog: 0,
                            posts: 0,
                            likes: 0,
                            comments: 0,
                            intervention: ''
                        };

                        try {
                            const userReactions = data.tracking[uid.toString()].reactions;
                            const userViews = data.tracking[uid.toString()].viewLogs;
                            const userActivities = data.activities[uid.toString()];
                            const goalHistory = data.goalHistory[uid.toString()];
                            const posts = data.posts;
                            const userActionLogs = data.tracking[uid.toString()].actionLogs;

                            newEntry.reactions = this.findReactions(userReactions, newEntry.start, newEntry.end);
                            const filteredReactions = newEntry.reactions
                                .filter(el => (el.notification.includes('leaderboard') || el.notification.includes('socialfeed')));
                            if (filteredReactions.length === 0) {
                                newEntry.intervention = 'no entry';
                            } else if (filteredReactions.length === 1) {
                                newEntry.intervention = filteredReactions[0].notification;
                            } else {
                                if (filteredReactions[0].notification === filteredReactions[1].notification) {
                                    newEntry.intervention = filteredReactions[0].notification;
                                    console.log('identical but more than 1 reaction', filteredReactions, uid);
                                } else {
                                    newEntry.intervention = 'more than 1 reaction';
                                    console.log('more than 1 reaction', filteredReactions, uid);
                                }
                            }
                            delete newEntry.reactions;

                            const viewTimes = this.findViews(userViews, newEntry.start, newEntry.end);
                            Object.keys(viewTimes).forEach(view => newEntry[view] = viewTimes[view]);

                            const viewTimesBefore = this.findViews(userViews, newEntry.before, newEntry.start);
                            Object.keys(viewTimesBefore).forEach(view => newEntry['before_' + view] = viewTimesBefore[view]);

                            [newEntry.activityModerate, newEntry.activityVigorous] =
                                this.findActivities(userActivities, newEntry.start, newEntry.end);

                            [newEntry.before_activityModerate, newEntry.before_activityVigorous] =
                                this.findActivities(userActivities, newEntry.before, newEntry.start);

                            [newEntry.posts, newEntry.likes, newEntry.comments] = this.findPosts(posts,
                                uid,
                                newEntry.start,
                                newEntry.end,
                                '-MHLIf7AA2gG7wB5WX_q')
                                .map(entry => entry.length);

                            this.findGoalProgress(userActivities, newEntry.start, goalHistory).forEach(goal => {
                                newEntry[goal.name.replace('-', '_') + '_current'] = goal.current;
                                newEntry[goal.name.replace('-', '_') + '_relative'] = goal.relative;
                                newEntry[goal.name.replace('-', '_') + '_target'] = goal.target;
                            });

                            [newEntry.before_actionLog, newEntry.lastOpened] = this.findActionLogs(userActionLogs, newEntry.before, newEntry.start);
                            [newEntry.actionLog, newEntry.lastOpened] = this.findActionLogs(userActionLogs, newEntry.start, newEntry.end);
                        } catch (e) {
                            console.log(e, this.currentUid);
                        }

                        if (uid in dailyDecisionPoints) {
                            dailyDecisionPoints[uid].push(newEntry);
                        } else {
                            dailyDecisionPoints[uid] = [newEntry];
                        }
                    }
                }
            }
            day += 1;
            iterator.add(1, 'day');
        }
        return decisionPoints;
    }

    findReactions(reactions, start, end) {
        if (reactions) {
            const results = [];
            for (const el of Object.keys(reactions)) {
                if (!reactions[el].aUsed) {
                    reactions[el].aUsed = 0;
                }

                if (reactions[el].time >= start && reactions[el].time <= end) {
                    results.push(reactions[el]);
                    reactions[el].aUsed += 1;
                }
            }
            return results;
        } else {
            console.log('err: no reactions');
            return [];
        }
    }

    findViews(userViews, start, end) {
        const viewTimes = {lastView: 0, nextView: Infinity};
        if (userViews) {
            for (const view of ['viewTime_addActivity', 'viewTime_dashboard', 'viewTime_information', 'viewTime_leaderboard', 'viewTime_menu', 'viewTime_profile', 'viewTime_progress', 'viewTime_socialfeed']) {
                viewTimes[view] = 0;
            }
            for (const page of Object.keys(userViews)) {
                let time = 0;
                for (const view of Object.keys(userViews[page.toString()])) {
                    const viewLog = userViews[page.toString()][view];
                    if (viewLog.startTime <= end && viewLog.endTime >= start) {
                        time += Math.min(viewLog.endTime, end) - Math.max(viewLog.startTime, start);
                    }
                    if (viewLog.endTime <= start && viewLog.endTime > viewTimes.lastView) {
                        viewTimes.lastView = viewLog.endTime;
                    }
                    if (viewLog.startTime >= end && viewLog.startTime < viewTimes.nextView) {
                        viewTimes.nextView = viewLog.startTime;
                    }
                }
                viewTimes['viewTime_' + page.toString().replace('-a', 'A')] = time;
            }
        } else {
            console.log('err: no views');
        }
        viewTimes.lastView = start - viewTimes.lastView;
        viewTimes.nextView = viewTimes.nextView - end;
        return viewTimes;
    }

    findActivities(userActivities, start, end) {
        if (userActivities) {
            const activities = {moderate: 0, vigorous: 0};
            for (const el of Object.keys(userActivities)) {
                const activity = userActivities[el];
                if (activity.startTime >= start && activity.startTime <= end) {
                    activities[activity.intensity] += activity.endTime - activity.startTime;
                }
            }
            return [activities.moderate, activities.vigorous];
        } else {
            console.log('err: no activities found', this.currentUid);
            return [0, 0];
        }
    }

    findGoalProgress(userActivities, timestamp, goalHistory) {
        const goals = [...Goal.defaultGoals];
        if (userActivities) {
            for (const activityId of Object.keys(userActivities)) {
                const activity = userActivities[activityId];
                const activityStartTime = moment(activity.startTime);
                const end = moment(parseInt(timestamp, 10));
                const start = end.clone();
                if (start.get('day') === 0) {
                    start.subtract(7, 'day');
                }
                start.startOf('week').startOf('day').add(1, 'day');

                for (const goal of goals) {
                    // @ts-ignore
                    if (goal.duration === 'daily'
                        && activityStartTime.isSame(end, 'day')
                        || goal.duration === 'weekly'
                        && activityStartTime.isSameOrBefore(end, 'day')
                        && activityStartTime.isSameOrAfter(start, 'day')) {
                        if (activity.intensity === 'vigorous' && goal.type === 'active') {
                            goal.current += 2 * (activity.endTime - activity.startTime);
                        } else {
                            goal.current += activity.endTime - activity.startTime;
                        }
                    }
                }
            }

            const previousDayKey = moment(timestamp).endOf('day').subtract(1, 'day').valueOf();
            if (goalHistory[previousDayKey]) {
                for (const goalId of Object.keys(goalHistory[previousDayKey])) {
                    const goal = goalHistory[previousDayKey][goalId];
                    goals.filter(el => el.name === goalId).forEach(el => {
                        el.current /= 60000;
                        el.target = goal.target;
                        el.relative = el.current / el.target;
                    });
                }
            } else {
                for (const goalId of Object.keys(goals)) {
                    const goal = goals[goalId];
                    goal.current /= 60000;
                    goal.relative = goal.current / goal.target;
                }
            }
        } else {
            console.log('err: no progress found', this.currentUid);
        }
        return goals;
    }

    findPosts(postList, uid, start, end, groupId) {
        if (postList && postList.users[uid]) {
            const posts = [];
            const likes = [];
            const comments = [];
            for (const el of Object.keys(postList.users[uid])) {
                const post = postList.groups[groupId][el];
                if (post.user === uid) {
                    posts.push(post);
                }
                if (post.createdAt > end || post.createdAt < moment(start).subtract(120, 'minutes').valueOf()) {
                    continue;
                }
                if (post.likes && post.likes.includes(uid)) {
                    likes.push(post);
                }
                if (post.comments && Object.keys(post.comments).filter(commentId => post.comments[commentId].uid === uid).length > 0) {
                    comments.push(post);
                }
            }
            return [posts, likes, comments];
        } else {
            console.log('err: no posts found', this.currentUid);
            return [[], [], []];
        }
    }

    findActionLogs(userActionLogs, start, end) {
        if (userActionLogs) {
            let lastLog = 0;
            const logs = [];
            for (const actionLogId of Object.keys(userActionLogs)) {
                const actionLog = userActionLogs[actionLogId];
                if (actionLog.timestamp <= end && actionLog.timestamp >= start) {
                    logs.push(actionLog);
                }
                if (actionLog.timestamp <= start && actionLog.timestamp >= lastLog) {
                    lastLog = actionLog.timestamp;
                }
            }
            return [logs.length, lastLog];
        } else {
            console.log('err: no action logs found', this.currentUid);
            return [0, 0];
        }
    }
}
