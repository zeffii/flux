import math
import numpy as np

import bpy
from sverchok.utils.geom import circle

from flux.core.node_tree import FluxCustomTreeNode, fx_update


class FluxCircleNode(FluxCustomTreeNode):
    bl_label = "Circle"
    bl_icon = 'SOUND'

    radius: bpy.props.FloatProperty(name='radius', description='huh', default=2.0, update=fx_update)
    points: bpy.props.IntProperty(name='num points', default=12, update=fx_update)

    def fx_init(self, context):
        self.inputs.new('FluxSocketGeneric', "radius")
        self.inputs.new('FluxSocketGeneric', "points")

        self.outputs.new('FluxSocketGeneric', "verts")
        self.outputs.new('FluxSocketGeneric', "edges")
        self.outputs.new('FluxSocketGeneric', "faces")

    def draw_buttons(self, context, layout):
        layout.prop(self, 'radius')
        layout.prop(self, 'points')

    def evaluate(self):
        #                           (radius=1.0, phase=0, nverts=20, matrix=None, mode='pydata')
        verts, edges, faces = circle(radius=self.radius, nverts=self.points, mode='np')
        print(verts)



register, unregister = bpy.utils.register_classes_factory([FluxCircleNode])