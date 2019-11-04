import math
import numpy as np

import bpy
from sverchok.utils.geom import circle

from flux.core.node_tree import FluxCustomTreeNode #, fx_update


class FluxDebugPrint(FluxCustomTreeNode):
    bl_label = "STDOUT"
    bl_icon = 'SOUND'

    def fx_init(self, context):
        self.inputs.new('FluxSocketGeneric', "sink")

    def evaluate(self):
        data = self.inputs["sink"].data_get()
        print(data)


register, unregister = bpy.utils.register_classes_factory([FluxDebugPrint])