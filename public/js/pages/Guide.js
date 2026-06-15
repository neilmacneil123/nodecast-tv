/**
 * Guide Page Controller
 */

class GuidePage {
    constructor(app) {
        this.app = app;
        this.playerWindow = document.getElementById('guide-player-window');
        this.playerDock = document.getElementById('guide-player-dock');
        this.liveDock = document.getElementById('live-player-dock');
        this.playerTitle = document.getElementById('guide-player-title');
        this.closeBtn = document.getElementById('guide-player-close');

        this.closeBtn?.addEventListener('click', () => {
            this.closeGuidePlayer({ stopPlayback: true });
        });
    }

    async init() {
        // EPG guide will lazy load when shown
    }

    showGuidePlayer(channel = null) {
        const videoContainer = document.getElementById('video-container');
        if (!this.playerWindow || !this.playerDock || !videoContainer) return;

        this.playerDock.appendChild(videoContainer);
        this.playerWindow.classList.remove('hidden');

        if (this.playerTitle) {
            this.playerTitle.textContent = channel?.name || channel?.tvgName || 'Live TV';
        }
    }

    closeGuidePlayer({ stopPlayback = false } = {}) {
        const videoContainer = document.getElementById('video-container');
        if (this.liveDock && videoContainer && videoContainer.parentElement !== this.liveDock.parentElement) {
            this.liveDock.insertAdjacentElement('afterend', videoContainer);
        }

        this.playerWindow?.classList.add('hidden');

        if (stopPlayback) {
            this.app.player?.stop();
        }
    }

    async show() {
        // Ensure channel data is loaded before rendering EPG
        // This fixes a race condition where navigating directly to the Guide page
        // before visiting Live TV would result in an empty EPG.
        const channelList = this.app.channelList;
        if (!channelList.channels || channelList.channels.length === 0) {
            await channelList.loadSources();
            await channelList.loadChannels();
        }

        // Only load EPG data if not already loaded
        if (!this.app.epgGuide.programmes || this.app.epgGuide.programmes.length === 0) {
            await this.app.epgGuide.loadEpg();
        } else {
            // Just re-render with existing data (updates time position)
            this.app.epgGuide.render();
        }

        if (this.app.player?.currentChannel) {
            this.showGuidePlayer(this.app.player.currentChannel);
        }
    }

    hide() {
        this.closeGuidePlayer();
    }
}

window.GuidePage = GuidePage;
