import { Composition, Folder } from 'remotion';
import { FaktVideo, SCREENS, sceneFrames, TOTAL_FRAMES } from './FaktVideo';
import { Intro } from './scenes/Intro';
import { Mobile } from './scenes/Mobile';
import { Outro } from './scenes/Outro';
import { Problem } from './scenes/Problem';
import { ScreenScene } from './scenes/ScreenScene';
import { FPS } from './theme';

const SIZE = { width: 1920, height: 1080, fps: FPS };

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="FaktPresentation" component={FaktVideo} durationInFrames={TOTAL_FRAMES} {...SIZE} />
    <Folder name="Scenes">
      <Composition id="Intro" component={Intro} durationInFrames={sceneFrames('intro')} {...SIZE} />
      <Composition id="Problem" component={Problem} durationInFrames={sceneFrames('problem')} {...SIZE} />
      {SCREENS.map((s) => (
        <Composition
          key={s.id}
          id={`Screen-${s.id}`}
          component={ScreenScene}
          durationInFrames={sceneFrames(s.id)}
          defaultProps={s}
          {...SIZE}
        />
      ))}
      <Composition id="Mobile" component={Mobile} durationInFrames={sceneFrames('mobile')} {...SIZE} />
      <Composition id="Outro" component={Outro} durationInFrames={sceneFrames('outro')} {...SIZE} />
    </Folder>
  </>
);
