import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, of, Subject } from "rxjs";
import {
  distinctUntilChanged,
  filter,
  map,
  switchMap,
  tap,
} from "rxjs/operators";
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
  currentTrack = new Observable<QueueTrack>();
  currentState: Observable<string>;
  mpdModesPanel: Observable<MpdModesPanel>;

  private mpdModesPanel$ = new Subject<MpdModesPanel>();
  private currentState$ = new Subject<string>();
  private prevTrack = new QueueTrack();

  constructor(
    private http: HttpClient,
    private rxStompService: AmpdRxStompService,
    private settingsService: SettingsService,
    private queueService: QueueService
  ) {
    this.buildStateSubscription();
    this.mpdModesPanel = this.mpdModesPanel$.asObservable();
    this.currentState = this.currentState$.asObservable();
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

  updateDatabase(): Observable<void> {
    const url = `${this.settingsService.getBackendContextAddr()}api/update-database`;
    return this.http.post<void>(url, {});
  }

  rescanDatabase(): Observable<void> {
    const url = `${this.settingsService.getBackendContextAddr()}api/rescan-database`;
    return this.http.post<void>(url, {});
  }

  getServerStatistics(): Observable<ServerStatistics> {
    const url = `${this.settingsService.getBackendContextAddr()}api/server-statistics`;
    return this.http.get<ServerStatistics>(url);
  }
  __getStateSubscription(): Observable<StateMsgPayload> {
    // TODO: Remove
    return this.rxStompService.watch("/topic/state").pipe(
      map((message) => message.body),
      map((body: string) => <StateMsgPayload>JSON.parse(body)),
      distinctUntilChanged((prev, curr) => {
        return JSON.stringify(curr) === JSON.stringify(prev);
      })
    );
  }

  getStateSubscription(): Observable<StateMsgPayload> {
    return this.rxStompService.watch("/topic/state").pipe(
      map((message) => message.body),
      map((body: string) => <StateMsgPayload>JSON.parse(body)),
      distinctUntilChanged((prev, curr) => {
        return JSON.stringify(curr) === JSON.stringify(prev);
      }),
      switchMap((payload) => {
        return of(payload);
      })
    );
  }

  getQueueTrackCount(): Observable<number> {
    return this.queueService
      .getQueueSubscription()
      .pipe(map((tracks) => tracks.length));
  }

  /**
   * Build the currentTrack object - holds info about the track currently played
   * @param payload StateMsgPayload
   */
  private buildCurrentQueueTrack(payload: StateMsgPayload): QueueTrack {
    let trackChanged = false;
    let track = new QueueTrack();
    if (payload.currentTrack) {
      if (this.prevTrack && this.prevTrack.id) {
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

  private buildStateSubscription(): void {
    this.currentTrack = this.getStateSubscription().pipe(
      tap((payload) => {
        this.mpdModesPanel$.next(payload.mpdModesPanelMsg);
        this.currentState$.next(payload.serverStatus.state);
      }),
      map((payload) => this.buildCurrentQueueTrack(payload)),
      filter(
        (queueTrack: QueueTrack) =>
          (queueTrack.artistName !== "" && queueTrack.title !== "") ||
          queueTrack.file !== ""
      )
    );
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
