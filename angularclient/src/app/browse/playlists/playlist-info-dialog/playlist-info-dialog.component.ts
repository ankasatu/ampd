import { AfterViewInit, Component, Inject, OnDestroy } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { Router } from "@angular/router";
import {
  BehaviorSubject,
  filter,
  map,
  Observable,
  startWith,
  Subject,
  Subscription,
  switchMap,
} from "rxjs";
import { MsgService } from "src/app/service/msg.service";
import { ResponsiveScreenService } from "src/app/service/responsive-screen.service";
import {
  InternMsgType,
  PaginationMsg,
} from "src/app/shared/messages/internal/internal-msg";
import { NotificationService } from "../../../service/notification.service";
import { PlaylistService } from "../../../service/playlist.service";
import { QueueService } from "../../../service/queue.service";
import { Playlist } from "../../../shared/messages/incoming/playlist";
import { PlaylistInfo } from "../../../shared/model/playlist-info";
import { ClickActions } from "../../../shared/track-table-data/click-actions.enum";
import { TrackTableOptions } from "../../../shared/track-table-data/track-table-options";

@Component({
  selector: "app-playlist-info-dialog",
  templateUrl: "./playlist-info-dialog.component.html",
  styleUrls: ["./playlist-info-dialog.component.scss"],
})
export class PlaylistInfoDialogComponent implements AfterViewInit, OnDestroy {
  isLoadingResults = new BehaviorSubject(true);
  playlistInfo: Observable<PlaylistInfo>;
  trackTableData = new TrackTableOptions();
  private isMobile = false;
  private msgSub = <Subscription>{};
  private playlistInfo$ = new Subject<PlaylistInfo>();

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: Playlist,
    private msgService: MsgService,
    private notificationService: NotificationService,
    private playlistService: PlaylistService,
    private queueService: QueueService,
    private responsiveScreenService: ResponsiveScreenService,
    private router: Router,
    public dialogRef: MatDialogRef<PlaylistInfoDialogComponent>
  ) {
    this.playlistInfo = this.playlistInfo$.asObservable();
    this.responsiveScreenService
      .isMobile()
      .subscribe((isMobile) => (this.isMobile = isMobile));
  }

  ngAfterViewInit(): void {
    this.isLoadingResults.next(false);

    this.msgSub = this.msgService.message
      .pipe(
        filter((msg) => msg.type === InternMsgType.PaginationEvent),
        map((msg) => <PaginationMsg>msg),
        map((msg) => msg.event),
        startWith({ pageIndex: null, pageSize: null })
      )
      .pipe(
        switchMap((pagination) => {
          this.isLoadingResults.next(true);
          return this.playlistService.getPlaylistInfo(
            this.data.name,
            pagination.pageIndex,
            pagination.pageSize
          );
        })
      )
      .subscribe((info) => {
        this.trackTableData = this.buildTable(info);
        this.playlistInfo$.next(info);
        this.isLoadingResults.next(false);
      });
  }

  ngOnDestroy(): void {
    this.msgSub.unsubscribe();
  }

  onDeletePlaylist(): void {
    this.playlistService.deletePlaylist(this.data.name).subscribe(() => {
      this.router
        .navigate(["/browse"])
        .then(() => {
          window.location.reload();
        })
        .catch(() => void 0);
    });
    this.dialogRef.close();
  }

  onAddPlaylist(): void {
    this.queueService.addPlaylist(this.data.name);
    this.notificationService.popUp(`Added playlist: "${this.data.name}"`);
  }

  private buildTable(info: PlaylistInfo): TrackTableOptions {
    const trackTable = new TrackTableOptions();
    trackTable.addTracks(info.tracks.content);
    trackTable.displayedColumns = this.getDisplayedColumns();
    trackTable.onPlayClick = ClickActions.AddPlayTrack;
    trackTable.totalElements = info.tracks.totalElements;
    trackTable.totalPages = info.tracks.totalPages;
    trackTable.pageIndex = info.tracks.number;
    trackTable.pageSize = info.tracks.numberOfElements;
    trackTable.showPageSizeOptions = false;
    return trackTable;
  }

  private getDisplayedColumns(): string[] {
    const displayedColumns = [
      { name: "artist-name", showMobile: true },
      { name: "album-name", showMobile: false },
      { name: "title", showMobile: true },
      { name: "length", showMobile: false },
      { name: "play-title", showMobile: false },
      { name: "add-title", showMobile: false },
    ];
    return displayedColumns
      .filter((cd) => !this.isMobile || cd.showMobile)
      .map((cd) => cd.name);
  }
}
