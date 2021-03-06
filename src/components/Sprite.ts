import { Animation, AnimationStep, AnimationTarget, AnimationValues } from '../animation/Animation';
import { HtmlParser } from '../parser/HtmlParser';
import { ResourceRegistry, ResourceType } from '../resource/ResourceRegistry';
import { DrawUtils } from '../utils/DrawUtils';
import { Stage } from './Stage';
import { IXObjectOptions, XObject, XObjectEvent } from './XObject';

/**
 * The definition of sprite, a sprite contains size, fps, image and frames.
 */
export type SpriteSheet = {
  /**
   * The original width of this sprite.
   */
  width: number;
  /**
   * The original height of this sprite.
   */
  height: number;
  /**
   * The fps controls the playing speed of this sprite.
   */
  fps: number;
  /**
   * The source of image which contains pictures of each frame, it is optional, the image can be
   * defined at each frame instead of have one big image contains all.
   */
  url?: string;

  /**
   * The image to draw into the context.
   */
  image?: HTMLImageElement;
  /**
   * A list of frame definitions.
   */
  frames: SpriteFrame[];
};

/**
 * The definition of sprite frame.
 */
export type SpriteFrame = {
  /**
   * The x-axis coordinate of the top left corner of the sub-rectangle of the source image to draw
   * into the destination context.
   * If not specified, the default value is 0.
   */
  srcX?: number;
  /**
   * The y-axis coordinate of the top left corner of the sub-rectangle of the source image to draw
   * into the destination context.
   * If not specified,, the default value is 0.
   */
  srcY?: number;
  /**
   * The width of the sub-rectangle of the source image to draw into the destination context.
   * If not specified, the entire rectangle from the coordinates specified by sx and sy to the
   * bottom-right corner of the image is used.
   */
  srcWidth?: number;
  /**
   * The height of the sub-rectangle of the source image to draw into the destination context.
   * Same as srcWidth, if not specified, the entire rectangle from the coordinates specified by sx
   * and sy to the bottom-right corner of the image is used.
   */
  srcHeight?: number;
  /**
   * The x-axis coordinate in the destination canvas at which to place the top-left corner of the
   * source image.
   * If not specified,, the default value is 0.
   */
  destX?: number;
  /**
   * The y-axis coordinate in the destination canvas at which to place the top-left corner of the
   * source image.
   * If not specified,, the default value is 0.
   */
  destY?: number;
  /**
   * The width to draw the image in the destination canvas. This allows scaling of the drawn image.
   * If not specified, the image is not scaled in width when drawn.
   */
  destWidth?: number;
  /**
   * The height to draw the image in the destination canvas. This allows scaling of the drawn image.
   * If not specified, the image is not scaled in height when drawn.
   */
  destHeight?: number;
  /**
   * The source of image of this frame.
   * If not specified, use the image in SpriteOption.
   */
  url?: string;
  /**
   * An element to draw into the context.
   * If not specified, use the image in SpriteOption.
   */
  image?: HTMLImageElement;
};

/**
 * A class defines controls when an sprite render which frame during the animation life cycle.
 * Not like a normal animation, the sprite frames are discrete, we only render the frame while goto
 * next one.
 */
class SpriteAnimationStep extends AnimationStep {
  /**
   * The targeted sprite instance.
   */
  private sprite: Sprite;
  /**
   * Create a SpriteAnimationStep instance with a sprite instance.
   * @param sprite The targeted sprite instance.
   */
  constructor(sprite: Sprite) {
    super(sprite, (sprite.spriteSheet.frames.length * 1000) / sprite.spriteSheet.fps);
    this.sprite = sprite;
  }

  /**
   * Calculates the current frame and decides need to update.
   * @param percent the current process of an animation play cycle.
   * @returns True if switch frame, false otherwise.
   */
  onUpdate(percent: number): AnimationValues | undefined {
    if (!this.sprite.spriteSheet || this.sprite.spriteSheet.frames.length === 0) {
      return undefined;
    }
    const index = Math.min(
      this.sprite.spriteSheet.frames.length - 1,
      Math.floor(this.sprite.spriteSheet.frames.length * percent)
    );
    if (index === this.sprite.currentFrame) {
      return undefined;
    } else {
      this.sprite.currentFrame = index;
      this.sprite.dispatchEvent(new XObjectEvent('update', true, true, this.sprite));
      return {
        currentFrame: index
      };
    }
  }
}

/**
 * This class represents a sprite object, which plays a sequence of frames from a SpriteSheet
 * instance.
 *
 * Code example:
 * ```typescript
 *  const sprite = new Sprite();
 *  const spriteSheet = {
 *    width: 480,
 *    height: 400,
 *    url: "./elephant.png",
 *    fps: 20,
 *    frames: []
 *  };
 *  for (let i = 0; i < 34; ++i) {
 *    opt.frames.push({ x: 0, y: 400 * i });
 *  }
 *  sprite.setSpriteSheet(spriteSheet).play();
 * ```
 */
export class Sprite extends XObject {
  /**
   * The SpriteSheet instance to play back.
   */
  public spriteSheet?: SpriteSheet;
  /**
   * Index of current frame.
   */
  public currentFrame: number = 0;
  /**
   * The animation instance to play the sprite sheet.
   */
  private animation?: Animation;

  /**
   * Create a sprite object, you need to call setSpriteSheet method after the instance was created.
   * @param options The options to create this object.
   */
  constructor(options?: IXObjectOptions) {
    super(options);
    if (options) {
      if (options.attributes && options.attributes.src) {
        ResourceRegistry.DefaultInstance.add(options.attributes.src, ResourceType.JSON).then(
          json => {
            this.setSpriteSheet(json);
            this.dispatchEvent(new XObjectEvent('load', false, true, this));
          }
        );
      }
    }
  }

  /**
   * Set the SpriteSheet to let this Sprite instance know how to play.
   * @param spriteSheet The SpriteSheet instance to be set.
   * @returns The current instance. Useful for chaining method calls.
   */
  public setSpriteSheet(spriteSheet: SpriteSheet): Sprite {
    this.spriteSheet = spriteSheet;
    if (this.spriteSheet) {
      if (this.spriteSheet.url) {
        ResourceRegistry.DefaultInstance.add(this.spriteSheet.url, ResourceType.IMAGE);
      }
      for (const frame of this.spriteSheet.frames) {
        if (frame.url) {
          ResourceRegistry.DefaultInstance.add(frame.url, ResourceType.IMAGE).then(() => {
            this.dispatchEvent(new XObjectEvent('update', true, true, this));
          });
        }
      }
    }
    this.dispatchEvent(new XObjectEvent('update', true, true, this));
    return this;
  }

  /**
   * returns stage of this element, or undefined if this element is not attached to a stage.
   * @returns Stage or undefined.
   */
  public getStage(): Stage | undefined {
    let element: XObject = this;
    while (element) {
      if (element instanceof Stage) {
        return element as Stage;
      }
      element = element.parent;
    }
    return undefined;
  }

  /**
   * Play the sprite for the specified times, -1 for infinite.
   * @param times How many times to play this sprite, -1 for infinite.
   * @returns The current instance. Useful for chaining method calls.
   */
  public play(times = -1): Sprite {
    if (this.animation) {
      this.animation.cancel();
      this.animation = undefined;
    }
    const stage = this.getStage();
    if (stage) {
      this.animation = stage
        .animate(this)
        .addStep(new SpriteAnimationStep(this))
        .times(times);
      this.animation.addEventListener('complete', () =>
        this.dispatchEvent(new XObjectEvent('stop', false, true, this))
      );
      this.dispatchEvent(new XObjectEvent('play', false, true, this));
    }
    return this;
  }

  /**
   * Pause the current playing.
   * @returns The current instance. Useful for chaining method calls.
   */
  public pause(): Sprite {
    if (this.animation && this.animation.pause()) {
      this.dispatchEvent(new XObjectEvent('pause', false, true, this));
    }
    return this;
  }

  /**
   * Resume the current playing.
   * @returns The current instance. Useful for chaining method calls.
   */
  public resume(): Sprite {
    if (this.animation && this.animation.resume()) {
      this.dispatchEvent(new XObjectEvent('resume', false, true, this));
    }
    return this;
  }

  /**
   * Stop the current playing.
   * @returns The current instance. Useful for chaining method calls.
   */
  public stop(): Sprite {
    if (this.animation) {
      this.animation.cancel();
      this.animation = undefined;
    }
    return this;
  }

  /**
   * Alias of play method.
   * @param times How many times to play this sprite, -1 for infinite.
   * @returns The current instance. Useful for chaining method calls.
   */
  public times(times: number): Sprite {
    return this.play(times);
  }

  /**
   * Set the index of current frame.
   * Please do not call this method while it is playing, it may be updated in next render time.
   * @param currentFrame the index of the specified frame.
   * @returns The current instance. Useful for chaining method calls.
   */
  public setCurrentFrame(currentFrame: number): Sprite {
    this.currentFrame = currentFrame;
    return this;
  }

  /**
   * Move to next frame.
   * Please do not call this method while it is playing, it may be updated in next render time.
   * @returns The current instance. Useful for chaining method calls.
   */
  public toNextFrame(): Sprite {
    this.currentFrame = (this.currentFrame + 1) % this.spriteSheet.frames.length;
    return this;
  }

  /**
   * Move to previous frame.
   * Please do not call this method while it is playing, it may be updated in next render time.
   * @param currentFrame the index of the specified frame.
   * @returns The current instance. Useful for chaining method calls.
   */
  public toPreviousFrame(): Sprite {
    this.currentFrame =
      (this.currentFrame - 1 + this.spriteSheet.frames.length) % this.spriteSheet.frames.length;
    return this;
  }

  /**
   * Draws content of this element to targeted canvas.
   * @param ctx The canvas rendering context of targeted canvas.
   */
  public drawContent(ctx: CanvasRenderingContext2D) {
    if (!this.spriteSheet || this.spriteSheet.frames.length === 0) {
      return;
    }
    const frame = this.spriteSheet.frames[this.currentFrame];
    DrawUtils.drawFrame(ctx, this.getContentRect(), frame, this.spriteSheet);
  }
}

HtmlParser.registerTag('sprite', Sprite);
