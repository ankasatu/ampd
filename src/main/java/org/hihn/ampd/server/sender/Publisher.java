package org.hihn.ampd.server.sender;

import org.bff.javampd.server.MPD;
import org.hihn.ampd.server.config.MpdConfiguration;
import org.hihn.ampd.server.message.incoming.MpdModesPanel;
import org.hihn.ampd.server.message.outgoing.StatePayload;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Repeatedly sends information via websocket. Keeps all conntected clients up to date.
 */
@Component
public class Publisher {

  private static final String QUEUE_URL = "/topic/queue";

  private static final String STATE_URL = "/topic/state";

  private static final long DELAY = 1000;

  private final MPD mpd;

  private final SimpMessagingTemplate template;

  @Autowired
  public Publisher(final MpdConfiguration mpdConfiguration,
      SimpMessagingTemplate template) {
    mpd = mpdConfiguration.mpd();
    this.template = template;
  }

  /**
   * Publishes the queue every second.
   */
  @Scheduled(fixedDelay = DELAY)
  public void publishQueue() {
    if (!mpd.isConnected()) {
      return;
    }
    // Tells javampd to get fresh data every second
    mpd.getServerStatus().setExpiryInterval(1L);
    template.convertAndSend(QUEUE_URL, mpd.getPlaylist().getSongList());
  }

  /**
   * Publishes the Mpd server state every second.
   */
  @Scheduled(fixedDelay = DELAY)
  public void publishState() {
    if (!mpd.isConnected()) {
      return;
    }
    // Tells javampd to get fresh data every second
    mpd.getServerStatus().setExpiryInterval(1L);
    final MpdModesPanel mpdModesPanel = new MpdModesPanel(mpd.getServerStatus());
    final StatePayload statePayload =
        new StatePayload(mpd.getServerStatus(), mpd.getPlayer().getCurrentSong(), mpdModesPanel);
    template.convertAndSend(STATE_URL, statePayload);
  }
}
