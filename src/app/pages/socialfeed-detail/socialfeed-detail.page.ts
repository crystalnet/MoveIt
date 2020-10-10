import {Component, OnInit} from '@angular/core';
import {Post} from '../../model/post';
import {Comment} from '../../model/comment';
import {PostService} from '../../services/post/post.service';
import {combineLatest, Observable} from 'rxjs';
import {Location} from '@angular/common';
import {UserService} from '../../services/user/user.service';
import {map} from 'rxjs/operators';
import {User} from 'src/app/model/user';
import {NavigationExtras, Router} from '@angular/router';

@Component({
    selector: 'app-socialfeed-detail',
    templateUrl: './socialfeed-detail.page.html',
    styleUrls: ['./socialfeed-detail.page.scss'],
})


export class SocialfeedDetailPage implements OnInit {
    posts: Observable<any[]>;
    postText: string;
    commentText = [];
    now = new Date();
    post: Post;
    displayedPosts: any[];
    user: User;
    publicUserData: any;
    userObservable: Observable<any>;
    nPosts = 0;


    link: Observable<string>;

    constructor(private router: Router, private postService: PostService, private location: Location, private userService: UserService) {
        this.location = location;
    }

    ngOnInit() {
        const publicUserData = this.userService.getUsersPublicData();
        this.posts = this.postService.getAllPosts();
        combineLatest([publicUserData, this.posts]).subscribe((results) => {
            console.log('ENTERED');
            this.publicUserData = results[0];
            this.loadMorePosts();
        });

        this.posts.subscribe(r => console.log(r));
        this.userObservable = this.userService.getUser();
        this.userObservable.subscribe(user => this.user = user);
    }

    loadMorePosts(event?) {
        this.nPosts += 5;
        this.posts = this.postService.getAllPosts(this.nPosts);
        this.posts.pipe(map(posts => posts.map(post => {
            const pseudoPost = {
                username: this.publicUserData[post.user].name,
                profilePictureUrl: this.publicUserData[post.user].profilePictureUrl,
                usernames: [],
                ...post
            };
            pseudoPost.usernames = pseudoPost.comments.map(comment => comment.user);
            return pseudoPost;
        }))).subscribe(posts => {
            this.displayedPosts = posts;
            if (event) {
                event.target.complete();
            }
        });
    }

    goBack() {
        this.location.back();
    }

    nextCommentPage(post: Post) {
        if (post.commentPage === post.comments.length) {
            post.commentPage = 1;
            document.getElementById('showAll').innerText = 'Show all comments';
        } else {
            post.commentPage = post.comments.length;
            document.getElementById('showAll').innerText = 'Show less comments';
        }

    }

    viewProfile(uid) {
        console.log(uid);
        const navigationExtras: NavigationExtras = {
            queryParams: {
                special: JSON.stringify(uid)
            }
        };
        console.log(navigationExtras);
        this.router.navigate(['/menu/profile/profile/view'], navigationExtras);
    }

    getTimeDifference(date: Date) {
        return Math.round(this.now.getTime() - date.getTime() / 60 * 1000);
    }

    newPost(text: string) {
        const post = new Post();
        post.content = text;
        post.type = 'manual';

        this.postService.createPost(post).then(
            res => console.log(res),
            err => console.log(err)
        );
        this.postText = '';
    }

    editPost() {
        this.postService.editPost('-LxfARsp_2al7-W3JYcf', new Post()).then(
            res => console.log(res),
            err => console.log(err)
        );
    }

    getPost() {
        this.postService.getPost('-LxfARsp_2al7-W3JYcf').then(
            res => console.log(res),
            err => console.log(err)
        );
    }

    getAllPosts() {
        return this.postService.getAllPosts();
    }

    like(liked) {
        // const liked = document.getElementsByName('userPlace')[i].id;
        this.postService.likePost(liked).then(
            res => console.log(res),
            err => console.log(err)
        );
        this.postService.getPost(liked).then(
            res => {
                this.post = res;
            },
            err => console.log(err)
        );
        console.log(this.post);
    }

    unlike(unliked) {
        // const unliked = document.getElementsByName('userPlace')[i].id;
        this.postService.unlikePost(unliked).then(
            res => console.log(res),
            err => console.log(err)
        );
    }

    newComment(post: Post, text) {
        console.log('here');
        console.log(this.commentText);
        if (this.commentText[post.id].length !== 0) {
            this.postService.createComment(post.id, text).then(
                res => {
                    // @ts-ignore
                    post.usernames.push(this.user.name);
                    console.log(res);
                    this.commentText[post.id] = '';
                },
                err => console.log(err)
            );
        }
    }

    editComment() {
        this.postService.editComment('-LxfARsp_2al7-W3JYcf', '-LxfDHCgec1oZ268jioI', new Comment()).then(
            res => console.log(res),
            err => console.log(err)
        );
    }

    getComment() {
        this.postService.getComment('-LxfARsp_2al7-W3JYcf', '-LxfDHCgec1oZ268jioI').then(
            res => console.log(res),
            err => console.log(err)
        );
    }

    getAllComments() {
        return this.postService.getAllComments('-LxfARsp_2al7-W3JYcf');
    }

    getUsername(id) {
        return this.userService.getUsernameById(id);
    }

    getSpecificProfilePictureUrl(id) {
        return this.userService.getSpecificProfilePictureUrl(id);
    }
}
