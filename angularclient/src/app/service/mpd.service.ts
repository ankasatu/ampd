import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { RxStompState } from "@stomp/rx-stomp";
import { Observable, of } from "rxjs";
import { filter, map, switchMap } from "rxjs/operators";
import { MpdModesPanel } from "../shared/messages/incoming/mpd-modes-panel";
import { StateMsgPayload } from "../shared/messages/incoming/state-msg-payload";
import { QueueTrack } from "../shared/model/queue-track";
import { ServerStatistics } from "../shared/model/server-statistics";
import { AmpdRxStompService } from "./ampd-rx-stomp.service";
import { QueueService } from "./queue.service";
import { SettingsService } from "./settings.service";
@Injectable({
  providedIn: "root",
})
export class MpdService {
  currentTrack$: Observable<QueueTrack>;
  currentState$: Observable<string>;
  mpdModesPanel$: Observable<MpdModesPanel>;

  private prevTrack = <QueueTrack>{};

  constructor(
    private http: HttpClient,
    private rxStompService: AmpdRxStompService,
    private settingsService: SettingsService,
    private queueService: QueueService
  ) {
    this.currentTrack$ = this.getStateSubscription$().pipe(
      map((payload) => this.buildCurrentQueueTrack(payload)),
      filter(
        (queueTrack: QueueTrack) =>
          (queueTrack.artistName !== "" && queueTrack.title !== "") ||
          queueTrack.file !== ""
      )
    );
    this.mpdModesPanel$ = this.getStateSubscription$().pipe(
      map((state) => state.mpdModesPanelMsg)
    );
    this.currentState$ = this.getStateSubscription$().pipe(
      map((state) => state.serverStatus.state)
    );
  }

  initEmptyControlPanel(): MpdModesPanel {
    return {
      random: false,
      consume: false,
      single: false,
      crossfade: false,
      repeat: false,
    } as MpdModesPanel;
  }

  buildCoverUrl(file: string): string {
    const url = `${this.settingsService.getBackendContextAddr()}api/find-track-cover`;
    return `${url}?path=${encodeURIComponent(file)}`;
  }

  updateDatabase$(): Observable<void> {
    const url = `${this.settingsService.getBackendContextAddr()}api/update-database`;
    return this.http.post<void>(url, {});
  }

  rescanDatabase$(): Observable<void> {
    const url = `${this.settingsService.getBackendContextAddr()}api/rescan-database`;
    return this.http.post<void>(url, {});
  }

  getServerStatistics$(): Observable<ServerStatistics> {
    const url = `${this.settingsService.getBackendContextAddr()}api/server-statistics`;
    return this.http.get<ServerStatistics>(url);
  }

  getStateSubscription$(): Observable<StateMsgPayload> {
    return this.rxStompService.watch("/topic/state").pipe(
      map((message) => message.body),
      map((body: string) => <StateMsgPayload>JSON.parse(body)),
      switchMap((payload) => {
        return of(payload);
      })
    );
  }

  getQueueTrackCount$(): Observable<number> {
    return this.queueService
      .getQueueSubscription()
      .pipe(map((tracks) => tracks.content.length));
  }

  isCurrentTrackRadioStream$(): Observable<boolean> {
    const re = new RegExp("^(http|https)://", "i");
    return this.currentTrack$.pipe(map((track) => re.test(track.file)));
  }

  isConnected$(): Observable<boolean> {
    return this.rxStompService.connectionState$.pipe(
      map((state) => state === RxStompState.OPEN)
    );
  }

  /**
   * Build the currentTrack object - holds info about the track currently played
   * @param payload StateMsgPayload
   */
  private buildCurrentQueueTrack(payload: StateMsgPayload): QueueTrack {
    let trackChanged = this.prevTrack === null;

    // Check if this is the first track. It will have the changed-attr set to true
    trackChanged =
      this.prevTrack &&
      Object.keys(this.prevTrack).length === 0 &&
      Object.getPrototypeOf(this.prevTrack) === Object.prototype;

    let track = new QueueTrack();
    if (payload.currentTrack) {
      if (!trackChanged && this.prevTrack && this.prevTrack.id) {
        if (payload.currentTrack.id !== this.prevTrack.id) {
          trackChanged = true;
        }
      }
      track = this.buildQueueTrack(payload, trackChanged);
      this.prevTrack = track;
    }
    return track;
  }

  private buildQueueTrack(
    payload: StateMsgPayload,
    trackChanged: boolean
  ): QueueTrack {
    const queueTrack = new QueueTrack(payload.currentTrack);
    queueTrack.coverUrl = this.buildCoverUrl(payload.currentTrack.file);
    queueTrack.elapsed = payload.serverStatus.elapsedTime;
    queueTrack.progress = payload.serverStatus.elapsedTime;
    queueTrack.changed = trackChanged;
    queueTrack.dir = this.buildDirForTrack(payload.currentTrack.file);
    return queueTrack;
  }
  /**
   * Strips the file name from the file path. This returns the directory that holds the tracks.
   * @param file
   */
  private buildDirForTrack(file: string): string {
    const splitted = file.split("/");
    const ret = splitted.slice(0, splitted.length - 1);
    return ret.join("/");
  }
}
