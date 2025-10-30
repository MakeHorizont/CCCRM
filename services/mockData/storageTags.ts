import { StorageTag } from '../../types';
import { TAG_COLORS } from '../../constants'; // Assuming TAG_COLORS is accessible

export let mockStorageTags: StorageTag[] = [
    { id: 'tag1', name: 'Холод', color: TAG_COLORS[1] },
    { id: 'tag2', name: 'Сухое', color: TAG_COLORS[3] },
];
