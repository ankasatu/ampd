package org.hihn.ampd.server.model.http;

public class SavePlaylist {

  private String playlistName;

  public SavePlaylist() {
  }

  public SavePlaylist(String playlistName) {
    this.playlistName = playlistName;
  }

  public String getPlaylistName() {
    return playlistName;
  }

  public void setPlaylistName(String playlistName) {
    this.playlistName = playlistName;
  }
}