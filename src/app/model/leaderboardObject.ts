export class LeaderboardObject {
    uid: string;
    username: string;
    value: number;
    age: number;
    pictureProfileUrl;

    constructor(uid: string, value: number, private publicUserData: any) {
        this.uid = uid;
        this.value = value || 0;
        if (publicUserData && uid in publicUserData) {
            this.username = publicUserData[uid].name;
            this.age = publicUserData[uid].age;
            this.pictureProfileUrl = publicUserData[uid].profilePictureUrl;
        } else {
            this.username = 'No Username';
            this.age = 0;
            this.pictureProfileUrl = '';
        }

    }

    compareTo(compare: LeaderboardObject): number {
        return (-1) * (this.value - compare.value);
    }
}
