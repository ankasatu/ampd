import { Component } from "@angular/core";
import { environment } from "../../environments/environment";
import { ConnConfUtil } from "../shared/conn-conf/conn-conf-util";
import { NotificationService } from "../shared/services/notification.service";
import { WebSocketService } from "../shared/services/web-socket.service";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { Observable } from "rxjs";

import { HttpClient } from "@angular/common/http";
import { BackendSettings } from "../shared/models/backend-settings";
import { SettingsService } from "../shared/services/settings.service";

@Component({
  selector: "app-settings",
  templateUrl: "./settings.component.html",
  styleUrls: ["./settings.component.scss"],
})
export class SettingsComponent {
  ampdVersion: string;
  coverCacheUsage = new Observable<number>();
  gitCommitId: string;
  isDarkTheme: Observable<boolean>;
  isDisplayCovers: boolean;
  backendSettings: Observable<BackendSettings>;
  coverBlacklist: Observable<string[]>;
  settingsForm: FormGroup;

  constructor(
    private notificationService: NotificationService,
    private webSocketService: WebSocketService,
    private formBuilder: FormBuilder,
    private settingsService: SettingsService,
    private http: HttpClient
  ) {
    const savedAddr = ConnConfUtil.getBackendAddr();
    this.ampdVersion = environment.ampdVersion;
    this.gitCommitId = environment.gitCommitId;
    this.isDarkTheme = this.settingsService.isDarkTheme();
    this.backendSettings = this.getSettings();
    this.coverBlacklist = this.getCoverBlacklist();
    this.isDisplayCovers = this.settingsService.isDisplayCovers();
    this.settingsForm = this.formBuilder.group({
      backendAddr: [savedAddr, Validators.required],
    });
  }

  onSubmit(): void {
    if (this.settingsForm.invalid) {
      this.notificationService.popUp("Invalid input.");
      return;
    }
    ConnConfUtil.setBackendAddr(this.settingsForm.controls.backendAddr.value);
    this.webSocketService.init();
    this.notificationService.popUp("Saved settings.");
  }

  toggleDarkTheme(checked: boolean): void {
    this.settingsService.setDarkTheme(checked);
    this.notificationService.popUp("Saved settings.");
  }

  toggleDisplayCovers(checked: boolean): void {
    this.settingsService.setDisplayCovers(checked);
    this.notificationService.popUp("Saved settings.");
  }

  private getSettings() {
    this.coverCacheUsage = this.getCoverCacheDiskUsage();
    const backendAddr = ConnConfUtil.getBackendAddr();
    const url = `${backendAddr}/api/settings`;
    return this.http.get<BackendSettings>(url);
  }

  private getCoverCacheDiskUsage() {
    const backendAddr = ConnConfUtil.getBackendAddr();
    const url = `${backendAddr}/api/cover-usage`;
    return this.http.get<number>(url);
  }

  private getCoverBlacklist() {
    const backendAddr = ConnConfUtil.getBackendAddr();
    const url = `${backendAddr}/api/cover-blacklist`;
    return this.http.get<string[]>(url);
  }
}
