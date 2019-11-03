import math
import numpy as np

import bpy
from sverchok.utils.geom import circle

from flux.core.node_tree import FluxCustomTreeNode, fx_update


class FluxCircleNode(FluxCustomTreeNode):
    # bl_idname = "FluxCircleNode"
    bl_label = "Circle"
    bl_icon = 'SOUND'

    radius: bpy.props.FloatProperty(name='radius', description='huh', default=2.0, update=fx_update)
    points: bpy.props.IntProperty(name='num points', default=12, update=fx_update)
    origin: bpy.props.FloatVectorProperty(name='origin', default=(0,0,0), size=3)

    def fx_init(self, context):
        self.inputs.new('FluxSocketNumber', "radius").prop_name = 'radius'
        self.inputs.new('FluxSocketNumber', "points").prop_name = 'points'
        self.inputs.new('FluxSocketVector', "origin").prop_name = 'origin'

        self.outputs.new('FluxSocketVector', "verts")
        self.outputs.new('FluxSocketNumber', "edges")
        self.outputs.new('FluxSocketNumber', "faces")

    # def draw_buttons(self, context, layout):
    #     layout.prop(self, 'radius')
    #     layout.prop(self, 'points')

    def evaluate(self):
        #                           (radius=1.0, phase=0, nverts=20, matrix=None, mode='pydata')
        verts, edges, faces = circle(radius=self.radius, nverts=self.points, mode='np')
        print(verts)



register, unregister = bpy.utils.register_classes_factory([FluxCircleNode])