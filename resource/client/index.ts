import { registerApi } from "./api";
import { Interaction } from "./interaction";
import { Scanner } from "./scanner";
import { NUI_LAYER } from "@aicore-fivem/shared";

// Stacking among NUI pages (`NUI_LAYER`): set at start, not left to load order.
SetNuiZindex(NUI_LAYER.target);

const scanner = new Scanner();
new Interaction(scanner);
registerApi(scanner);
scanner.start();
