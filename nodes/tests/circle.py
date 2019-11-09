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
    origin: bpy.props.FloatVectorProperty(name='origin', default=(0,0,0), size=3, update=fx_update)

    def fx_init(self, context):
        self.inputs.new('FluxSocketNumber', "radius").prop_name = 'radius'
        self.inputs.new('FluxSocketNumber', "points").prop_name = 'points'
        self.inputs.new('FluxSocketVector', "origin").prop_name = 'origin'

        self.outputs.new('FluxSocketVector', "verts")
        self.outputs.new('FluxSocketNumber', "edges")
        self.outputs.new('FluxSocketNumber', "faces")

    def evaluate(self):
        #                           (radius=1.0, phase=0, nverts=20, matrix=None, mode='pydata')
        verts, edges, faces = circle(radius=self.radius, nverts=self.points, mode='np')
        self.outputs['verts'].data_set(verts)
        self.outputs['edges'].data_set(edges)
        self.outputs['faces'].data_set(faces)



register, unregister = bpy.utils.register_classes_factory([FluxCircleNode])