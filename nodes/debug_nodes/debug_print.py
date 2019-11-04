import sys
import math
import numpy as np

import bpy
from sverchok.utils.geom import circle

from flux.core.node_tree import FluxCustomTreeNode #, fx_update


class FluxDebugPrint(FluxCustomTreeNode):
    bl_label = "STDOUT"
    bl_icon = 'SOUND'

    def fx_init(self, context):
        self.inputs.new('FluxSocketGeneric', "sink").draw_socket = "draw_sink_socket"

    def evaluate(self):
        sink = self.inputs["sink"]
        if sink.is_linked:
            data = sink.data_get()
            print(data)

    @staticmethod
    def draw_sink_socket(socket, context, layout, node, text):
        row = layout.row()
        row.label(text=text)
        if sys.platform[:3] == "win":
            row.separator()
            row.operator("wm.console_toggle", icon='CONSOLE')


register, unregister = bpy.utils.register_classes_factory([FluxDebugPrint])