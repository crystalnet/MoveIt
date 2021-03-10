export class LeaderboardObject {
    uid: string;
    group: string;
    username: string;
    value: number;
    age: number;
    gender: string;
    pictureProfileUrl;

    constructor(uid: string, value: number, private publicUserData: any) {
        this.uid = uid;
        this.value = value || 0;
        if (publicUserData && uid in publicUserData) {
            this.username = publicUserData[uid].name;
            this.age = publicUserData[uid].age;
            this.group = publicUserData[uid].group;
            this.gender = publicUserData[uid].gender;
            this.pictureProfileUrl = publicUserData[uid].profilePictureUrl;
        } else {
            this.username = 'No Username';
            this.age = 0;
            this.pictureProfileUrl = '';
        }

    }

    compareTo(compare: LeaderboardObject): number {
        return (-1) * (this.value - compare.value );
    }
}
