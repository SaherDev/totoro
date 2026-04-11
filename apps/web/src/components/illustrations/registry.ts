export type IllustrationId =
  | 'auth'
  | 'idle-welcoming'
  | 'raining'
  | 'encouraging'
  | 'excited'
  | 'knowing'
  | 'welcome-back'
  | 'listen'
  | 'empty'
  | 'add-place'
  | 'add-place-processing'
  | 'add-place-success';

export type AnimationClass =
  | 'animate-pulse'
  | 'animate-bounce'
  | 'animate-spin'
  | 'animate-none'
  | '';

export interface IllustrationDefinition {
  id: IllustrationId;
  src: string;
  altKey: string;
  animationClass?: AnimationClass;
}

export const ILLUSTRATION_REGISTRY: Record<IllustrationId, IllustrationDefinition> = {
  'auth': {
    id: 'auth',
    src: '/illustrations/totoro-auth.svg',
    altKey: 'illustrations.auth',
  },
  'idle-welcoming': {
    id: 'idle-welcoming',
    src: '/illustrations/totoro-idle-welcoming.svg',
    altKey: 'illustrations.idleWelcoming',
  },
  'raining': {
    id: 'raining',
    src: '/illustrations/totoro-raining.svg',
    altKey: 'illustrations.raining',
  },
  'encouraging': {
    id: 'encouraging',
    src: '/illustrations/totoro-encouraging.svg',
    altKey: 'illustrations.encouraging',
  },
  'excited': {
    id: 'excited',
    src: '/illustrations/totoro-excited.svg',
    altKey: 'illustrations.excited',
  },
  'knowing': {
    id: 'knowing',
    src: '/illustrations/totoro-knowing.svg',
    altKey: 'illustrations.knowing',
  },
  'welcome-back': {
    id: 'welcome-back',
    src: '/illustrations/totoro-welcome-back.svg',
    altKey: 'illustrations.welcomeBack',
  },
  'listen': {
    id: 'listen',
    src: '/illustrations/totoro-listen.svg',
    altKey: 'illustrations.listen',
  },
  'empty': {
    id: 'empty',
    src: '/illustrations/totoro-empty.svg',
    altKey: 'illustrations.empty',
  },
  'add-place': {
    id: 'add-place',
    src: '/illustrations/totoro-add-place.svg',
    altKey: 'illustrations.addPlace',
  },
  'add-place-processing': {
    id: 'add-place-processing',
    src: '/illustrations/totoro-add-place-processing.svg',
    altKey: 'illustrations.addPlaceProcessing',
  },
  'add-place-success': {
    id: 'add-place-success',
    src: '/illustrations/totoro-add-place-success.svg',
    altKey: 'illustrations.addPlaceSuccess',
  },
};
