import { registerApi } from "./api"
import { Interaction } from "./interaction"
import { Scanner } from "./scanner"

const scanner = new Scanner()
new Interaction(scanner)
registerApi(scanner)
scanner.start()
