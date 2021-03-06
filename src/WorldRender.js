import { Render } from "./Render.js";
import { Camera } from "./Camera.js";
import * as glsl from "./glsl.js";
import { Block } from "./Block.js";
import { ChunksModule } from "./WorldChunkModule.js";
import { HighlightSelectedBlock } from "./HighlightSelectedBlock.js";

class WorldRender extends Render {
    constructor(canvas, world = null) {
        super(canvas);
        this.fitScreen();
        window.addEventListener("resize", this.fitScreen.bind(this, 1, 1));
        const {ctx} = this;
        ctx.clearColor(0.62, 0.81, 1.0, 1.0);
        ctx.clearDepth(1.0);
        ctx.clear(ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT);
        ctx.enable(ctx.DEPTH_TEST);
        ctx.depthFunc(ctx.LEQUAL);
        ctx.enable(ctx.CULL_FACE);
        ctx.frontFace(ctx.CCW);
        this.mainCamera = new Camera(this.aspectRatio, { fovy: 70, pitch: -90 * Math.PI / 180, position: [0, 20, 0] });
        this.addCamera(this.mainCamera);
        const blockTex = this.createTexture(Block.defaultBlockTextureImg);
        this.createProgram("showBlock", glsl.showBlock.vert, glsl.showBlock.frag)
            .use().bindTex("texture", blockTex);
        this.createProgram("selector", glsl.selector.vert, glsl.selector.frag);
        if (world !== null) this.setWorld(world);
    };
    setWorld(world) {
        if ((!world) || world === this.world) return;
        world.setRenderer(this);
        this.world = world;
        this.mainCamera.bindEntity(world.mainPlayer);
        this.chunksModule = new ChunksModule(world, this);
        this.blockHighlight = new HighlightSelectedBlock(world, this);
    };
    onRender(timestamp, dt) {
        this.world.update(dt);
        this.chunksModule.update();
        const {ctx} = this;
        ctx.clear(ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT);
        this.chunksModule.draw();
        this.blockHighlight.draw();
        ctx.flush();
    };
};

export {
    WorldRender,
    WorldRender as dafault
};
