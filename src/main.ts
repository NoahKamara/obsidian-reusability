import { link } from "fs"
import { App, Component, MarkdownPostProcessorContext, MarkdownRenderChild, MarkdownRenderer, Plugin, TFile, Vault, getLinkpath, parseLinktext, resolveSubpath } from "obsidian"

const logger = {
    debug: (message?: string, ...optionalParams: any[]) => {
        console.debug("[reusability] " + message, ...optionalParams)
    },
    info: (message?: string, ...optionalParams: any[]) => {
        console.info("[reusability] " + message, ...optionalParams)
    }
}

type ReferenceOptions = {
    block?: string
}

export default class Reusability extends Plugin {
    async onload() {
        logger.info("loading")
        this.registerProcessor()

        this.app.workspace.onLayoutReady(() => {
            const id = "dataview"

            // @ts-ignore
            const plugins = this.app.plugins.plugins

            logger.info("available", plugins)

            if (!Object.keys(plugins).contains(id)) {
                logger.info("dataview is missing")
                return
            }

            const dv = plugins[id]
            logger.info("dataview found", dv)
        });
    }

    async onunload() {
        logger.info("unloading")
    }

    /** Register a markdown post processor with the given priority. */
    public registerPriorityMarkdownPostProcessor(
        priority: number,
        processor: (el: HTMLElement, ctx: MarkdownPostProcessorContext) => Promise<void>
    ) {
        let registered = this.registerMarkdownPostProcessor(processor);
        registered.sortOrder = priority;
    }

    registerProcessor(): void {
        logger.info("register codeblock processor")

        this.registerMarkdownCodeBlockProcessor("reusable", async (source, el, ctx) => {
            logger.info("processing block")
            logger.info("Element", el)
            logger.info("Element", ctx)

            const options: ReferenceOptions = source
                .split("\n")
                .filter((row) => row.length > 0)
                .reduce((partialResult, row, currentIndex, array) => {
                    let key_val = row.split(':')
                    const key = key_val[0].trim()
                    const val = key_val[1].trim()

                    return {
                        ...partialResult,
                        [key]: val
                    }
                }, {})


            logger.info("Options", options)

            // Convert Text to Link
            const link2reusable = parseLinktext(options.block!)
            logger.info("link", link2reusable, getLinkpath(options.block!))

            // Retrieve linked file
            const file = this.app.vault.getMarkdownFiles()
                .filter(f => f.path == link2reusable.path + ".md")[0]
            logger.info("file", file)

            // Read Content 
            el.createSpan({ text: "Heading 1" })
            const content = await this.app.vault.read(file)

            logger.info("content", content)

            const referenceContainer = new Component()


            await MarkdownRenderer.render(this.app, content, el, ctx.sourcePath, referenceContainer)
            // for (let i = 0; i < rows.length; i++) {
            //   const cols = rows[i].split(",");

            //   const row = body.createEl("tr");

            //   for (let j = 0; j < cols.length; j++) {
            //     row.createEl("td", { text: cols[j] });
            //   }
            // }
        });
    }
}
