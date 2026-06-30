/**
 * EPG search filtering and programme match indexing.
 */

const EPG_SEARCH_MODES = {
    all: { includeChannels: true, fields: ['title', 'description'] },
    channels: { includeChannels: true, fields: [] },
    'program-title': { includeChannels: false, fields: ['title'] },
    'program-description': { includeChannels: false, fields: ['description'] },
    'program-both': { includeChannels: false, fields: ['title', 'description'] }
};

class EpgSearch {
    constructor() {
        this.programmesByChannelId = new Map();
        this.programSearchMatches = new Map();
    }

    buildIndex(programmes = []) {
        this.programmesByChannelId.clear();
        for (const programme of programmes) {
            const channelId = programme.channelId;
            if (!channelId) continue;
            if (!this.programmesByChannelId.has(channelId)) {
                this.programmesByChannelId.set(channelId, []);
            }
            this.programmesByChannelId.get(channelId).push(programme);
        }
    }

    getProgramKey(programme) {
        return [
            programme.channelId || '',
            programme.start || '',
            programme.stop || '',
            programme.title || ''
        ].join('|');
    }

    programmeMatches(programme, searchTerm, searchMode = 'all') {
        const config = EPG_SEARCH_MODES[searchMode] || EPG_SEARCH_MODES.all;
        if (!config.fields.length) return false;

        const title = (programme.title || '').toLowerCase();
        const description = (programme.description || programme.desc || '').toLowerCase();
        const fieldValues = {
            title,
            description
        };

        return config.fields.some(field => fieldValues[field].includes(searchTerm));
    }

    getProgramMatches(epgChannel, searchTerm, searchMode = 'all') {
        if (!epgChannel || !searchTerm) return [];
        const programmes = this.programmesByChannelId.get(epgChannel.id) || [];
        return programmes.filter(programme => this.programmeMatches(programme, searchTerm, searchMode));
    }

    filter(allMatchedChannels, searchTerm, searchMode = 'all', getChannelKey) {
        this.programSearchMatches.clear();
        const normalizedTerm = (searchTerm || '').toLowerCase().trim();
        if (!normalizedTerm) {
            return null;
        }

        const config = EPG_SEARCH_MODES[searchMode] || EPG_SEARCH_MODES.all;

        return allMatchedChannels.filter(channelMatch => {
            const sourceChannel = channelMatch.sourceChannel || {};
            const name = (sourceChannel.name || '').toLowerCase();
            const group = (sourceChannel.groupTitle || '').toLowerCase();
            const channelMatches = config.includeChannels && (name.includes(normalizedTerm) || group.includes(normalizedTerm));
            const programMatches = config.fields.length
                ? this.getProgramMatches(channelMatch.epgChannel, normalizedTerm, searchMode)
                : [];

            if (programMatches.length > 0 && typeof getChannelKey === 'function') {
                this.programSearchMatches.set(
                    getChannelKey(sourceChannel),
                    new Set(programMatches.map(programme => this.getProgramKey(programme)))
                );
            }

            return channelMatches || programMatches.length > 0;
        });
    }
}

window.EpgSearch = EpgSearch;
window.EPG_SEARCH_MODES = EPG_SEARCH_MODES;