import { link } from "fs"
import { App, Component, MarkdownPostProcessor, MarkdownPostProcessorContext, MarkdownRenderChild, MarkdownRenderer, Plugin, Reference, TFile, Vault, getLinkpath, parseFrontMatterEntry, parseFrontMatterStringArray, parseLinktext, resolveSubpath } from "obsidian"

type Processor = {
    block?: string[]
    inline?: string[]
}

export const supportedPlugins = {
    "dataview": {
        block: [
            "dataviewInline"
        ]
    }
}

const logger = {
    debug: (message?: string, ...optionalParams: any[]) => {
        console.debug("[reusability] " + message, ...optionalParams)
    },
    info: (message?: string, ...optionalParams: any[]) => {
        console.info("[reusability] " + message, ...optionalParams)
    }
}

type ReferenceOptions = {
    source: string,
    resolveInSource: boolean
}

type ParsingFN = (el: HTMLElement, component: Component | MarkdownPostProcessorContext, sourcePath: string) => Promise<void>

class ParsingPlugin {
    public id: string
    plugin: Plugin
    fn: string


    constructor(id: string, plugin: Plugin, fn: string) {
        this.id = id
        this.plugin = plugin
        this.fn = fn
    }

    async render(
        el: HTMLElement,
        component: Component | MarkdownPostProcessorContext,
        sourcePath: string
    ): Promise<void> {
        // @ts-ignore
        await this.plugin[this.fn](el, component, sourcePath)
    }
}

// export function buildPluginStaticResourceSrc(plug: Plugin_2, assetPath: string) {
//     return plug.app.vault.adapter.getResourcePath(pathJoin(plug.app.vault.configDir, "plugins", plug.manifest.id, assetPath))
//   }


export default class Reusability extends Plugin {
    plugins: ParsingPlugin[] = [];
    processor!: MarkdownPostProcessor;

    private loadPlugins() {
        // @ts-ignore
        const plugins = this.app.plugins.plugins

        logger.debug("plugins", Object.keys(supportedPlugins))

        for (const [pluginID, plugin] of Object.entries(plugins)) {

            if (Object.keys(supportedPlugins).contains(pluginID)) {
                logger.debug(`found plugin: ${pluginID}`)
                this.plugins.push(new ParsingPlugin(pluginID, plugins[pluginID], "dataviewInline"))
            }
        }

        // @ts-ignore
        logger.info(`found ${this.plugins.length} supported plugins out of ${Object.keys(plugins).length}`)
    }

    async onload() {
        logger.info("loading")

        this.app.workspace.onLayoutReady(() => {
            logger.info("loading plugins")
            this.loadPlugins()

            logger.info("register codeblock processor")
            this.processor = this.registerMarkdownCodeBlockProcessor("reusable", async (src, el, ctx) => {
                await this.processCodeBlock(src, el, ctx)
            });
        });
    }

    async onunload() {
        logger.info("unloading")
    }



    async processCodeBlock(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
        const processCodeBlockOptions = (optionString: string): ReferenceOptions | null => {
            const raw: Map<string, string> = optionString.split("\n")
                .filter((row) => row.length > 0)
                .reduce((partialResult: Map<string, string>, row, currentIndex, array) => {
                    let key_val = row.split(':')
                    const key = key_val[0].trim()
                    const val = key_val[1].trim()

                    partialResult.set(key, val)
                    return partialResult
                }, new Map<string, string>()
                );




            const source = raw.get("source")

            if (source) {
                return {
                    source: source,
                    resolveInSource: raw.get("resolveInSource")?.toLowerCase() == "true"
                }
            } else { return null }
        }


        logger.info("processing block", ctx.sourcePath)

        // Parse Block Options
        let options = processCodeBlockOptions(source);

        if (!options) {
            logger.info("failed to parse options")
            return
        }

        logger.debug("Options", options)

        // Read Content 
        let content!: string
        let contentPath!: string

        if (options.source.startsWith("$")) {
            logger.debug("source is reference")
            content = "ERROR"
            contentPath = ctx.sourcePath
        } else {
            logger.debug("source is file")
            const link2reusable = parseLinktext(options.source)
            
            // Retrieve linked file
            const file = this.app.vault
                .getMarkdownFiles()
                .filter(f => f.path == link2reusable.path + ".md")[0]

            logger.debug("found file", file.path)
            contentPath = file.path

            logger.debug(contentPath)
            content = await this.app.vault.cachedRead(file)
        }

        // Render Content
        const referenceContainer = new Component()
        await MarkdownRenderer.render(this.app, content, el, ctx.sourcePath, referenceContainer)

        // Set SourcePath to snippet source if `resolveInSource` is true
        const pluginSourcePath = options.resolveInSource ? contentPath : ctx.sourcePath

        // Run Plugins
        this.plugins.forEach(p => p.render(el, ctx, pluginSourcePath))
    }
}

