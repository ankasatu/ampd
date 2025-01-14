import {
  Component,
  ElementRef,
  HostListener,
  Input,
  OnInit,
  ViewChild,
} from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { BehaviorSubject, Observable } from "rxjs";
import { distinctUntilChanged, map } from "rxjs/operators";
import { FrontendSettingsService } from "src/app/service/frontend-settings.service";
import {
  FilterMsg,
  InternMsgType,
} from "src/app/shared/messages/internal/internal-msg";
import { SettingKeys } from "src/app/shared/model/internal/frontend-settings";
import { ControlPanelService } from "../../service/control-panel.service";
import { MsgService } from "../../service/msg.service";
import { NotificationService } from "../../service/notification.service";
import { QueueService } from "../../service/queue.service";
import { AmpdBrowsePayload } from "../../shared/model/ampd-browse-payload";

@Component({
  selector: "app-browse-navigation",
  templateUrl: "./browse.navigation.component.html",
  styleUrls: ["./browse.navigation.component.scss"],
})
export class BrowseNavigationComponent implements OnInit {
  @ViewChild("filterInputElem") filterInputElem?: ElementRef;
  @Input() browsePayload = new Observable<AmpdBrowsePayload>();
  @Input() filterDisabled = false;

  dirUp$ = new BehaviorSubject<string>("/");
  filterDisabled$ = new BehaviorSubject<boolean>(true);
  filter = "";
  getParamDir = "/";
  displayAlbums$: Observable<boolean>;
  displayGenres$: Observable<boolean>;
  displayRadio$: Observable<boolean>;
  displayBrowseClearQueue$: Observable<boolean>;

  constructor(
    private activatedRoute: ActivatedRoute,
    private controlPanelService: ControlPanelService,
    private fsService: FrontendSettingsService,
    private messageService: MsgService,
    private notificationService: NotificationService,
    private queueService: QueueService
  ) {
    this.displayAlbums$ = this.fsService.getBoolValue$(
      SettingKeys.DISPLAY_ALBUMS
    );
    this.displayGenres$ = this.fsService.getBoolValue$(
      SettingKeys.DISPLAY_GENRES
    );
    this.displayRadio$ = this.fsService.getBoolValue$(
      SettingKeys.DISPLAY_RADIO
    );
    this.displayBrowseClearQueue$ = this.fsService.getBoolValue$(
      SettingKeys.DISPLAY_BROWSE_CLEAR_QUEUE
    );

    this.activatedRoute.queryParamMap
      .pipe(
        map((qp) => <string>qp.get("dir") || "/"),
        distinctUntilChanged()
      )
      .subscribe((dir) => {
        this.buildDirUp(dir);
        this.getParamDir = dir;
      });
  }

  @HostListener("document:keydown.f", ["$event"])
  onSearchKeydownHandler(event: KeyboardEvent): void {
    if ((event.target as HTMLInputElement).tagName === "INPUT") {
      return;
    }
    event.preventDefault();
    if (this.filterInputElem) {
      (this.filterInputElem.nativeElement as HTMLElement).focus();
    }
  }

  ngOnInit(): void {
    if (this.filterDisabled) {
      // @Input() has precedence over a tracks-only-directory
      this.filterDisabled$.next(false);
    } else {
      this.browsePayload.subscribe((payload) =>
        this.filterDisabled$.next(!this.isTracksOnlyDir(payload))
      );
    }
  }

  onAddDir(dir: string): void {
    if (dir.startsWith("/")) {
      dir = dir.substring(1, dir.length);
    }
    this.queueService.addDir(dir);
    this.notificationService.popUp(`Added dir: "${dir}"`);
  }

  onPlayDir(dir: string): void {
    this.onAddDir(dir);
    this.controlPanelService.play();
    this.notificationService.popUp(`Playing directory: "${dir}"`);
  }

  onClearQueue(): void {
    this.queueService.clearQueue();
    this.notificationService.popUp("Cleared queue");
  }

  applyFilter(eventTarget: EventTarget | null): void {
    if (!eventTarget) {
      return;
    }
    const term = (<HTMLInputElement>eventTarget).value;
    this.filter = term;
    if (term) {
      this.messageService.sendMessage({
        type: InternMsgType.BrowseFilter,
        filterValue: term,
      } as FilterMsg);
    } else {
      this.resetFilter();
    }
  }

  resetFilter(): void {
    this.filter = "";
    this.messageService.sendMessage({
      type: InternMsgType.BrowseFilter,
      filterValue: "",
    } as FilterMsg);
  }

  private buildDirUp(dir: string): void {
    const splitted = decodeURIComponent(dir).split("/");
    splitted.pop();
    let targetDir = splitted.join("/");
    if (targetDir.length === 0) {
      targetDir = "";
    }
    this.dirUp$.next(encodeURIComponent(targetDir));
  }

  private isTracksOnlyDir(tmpPayload: AmpdBrowsePayload): boolean {
    return (
      tmpPayload.playlists.length === 0 &&
      tmpPayload.directories.length === 0 &&
      tmpPayload.tracks.length > 0
    );
  }
}
