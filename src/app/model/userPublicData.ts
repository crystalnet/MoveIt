interface FireBaseObject {
    id: string;
    name: string;
    age: number;
    profilePictureUrl: string;

}

export class UserPublicData {

    /**
     * Constructor to create User object
     *
     * Each parameter is optional. If it's not present, a default value is used
     *
     */
    constructor(id?: string, name?: string, age?: number, profilePictureUrl?: string) {
        // Each parameter is optional, if it's not there, set the default value
        this.id = id || '-1';
        this.name = name || 'No username';
        this.age = age || 0;
        this.profilePictureUrl = profilePictureUrl || '';
    }

    id: string;
    name: string;
    age: number;
    profilePictureUrl: string;

    static fromFirebaseObject(id: string, firebaseObject: FireBaseObject) {
        return new UserPublicData(
            id || '',
            firebaseObject.name || 'Test Account',
            firebaseObject.age || 0,
            firebaseObject.profilePictureUrl || ''
        );
    }

    /**
     * toFireBaseObject
     *
     * Converts the User object to a firebase object. It basically just replaces the arrays with a JSON string.
     * We could also hand over the whole user object to firebase, but then it would use the arrays as subelements.
     * If we substitute the arrays with their string representation, firebase will just store them as a string as well
     * and not try to parse them.
     *
     */
    toFirebaseObject() {
        return {
            name: this.name,
            age: this.age,
            profilePictureUrl: this.profilePictureUrl,
        };
    }
}
